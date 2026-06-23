"""
FIN Connector Backend — FastAPI Server
Template-based: all project-specific values come from config.json.
Exposes REST API for the React frontend to consume.
Also serves the compiled viewer app from the 'static/' directory.
"""

import asyncio
import json
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from fin_client import FinScramClient, parse_custom_response, aggregate_and_restructure

# ─── Load Config ─────────────────────────────────────────────────────────────

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

PROJECT_NAME = CONFIG["project_name"]
FIN_SERVER_URL = CONFIG.get("fin_server_url", "https://localhost")

# ─── Global State ────────────────────────────────────────────────────────────

client: Optional[FinScramClient] = None
polling_task: Optional[asyncio.Task] = None

# Cached data (updated by background polling)
cached_equip_data: dict = {}
cached_power_data: dict = {}
cached_building_data: dict = {}
cached_sensor_avg: dict = {"temp": None, "humidity": None, "co2": None, "water": None}
cached_power_history: dict = {}
cached_fdd_summary: list = []


# ─── Background Polling ─────────────────────────────────────────────────────

async def polling_loop():
    """Background loop that fetches FIN data every 30s (realtime) and 5s (power)."""
    global cached_equip_data, cached_power_data, cached_building_data
    global cached_sensor_avg, cached_power_history, cached_fdd_summary

    if not client or not client.is_authenticated:
        return

    while True:
        try:
            # Resolve endpoints from config
            rt_endpoints = CONFIG.get("realtime_endpoints", {})
            pw_endpoints = CONFIG.get("power_endpoints", {})
            live_ids = CONFIG.get("live_point_ids", {})

            # 1. Fetch realtime equipment data
            realtime = await client.fetch_realtime_data(rt_endpoints)
            cached_equip_data = {
                "timestamp": datetime.now().isoformat(),
                "equipment": _flatten_equip(realtime),
            }

            # 2. Fetch power histories
            power_hist = await client.fetch_power_histories(pw_endpoints)
            cached_power_history = power_hist

            # 3. Fetch live point values in parallel
            live_tasks = {}
            for key, point_id in live_ids.items():
                live_tasks[key] = client.fetch_live_point(point_id)

            live_results = {}
            keys = list(live_tasks.keys())
            values = await asyncio.gather(*live_tasks.values(), return_exceptions=True)
            for k, v in zip(keys, values):
                live_results[k] = None if isinstance(v, Exception) else v

            # 4. Compute sensor averages from realtime data
            _compute_sensor_averages(realtime)

            # 5. Build FDD summary
            fdd_list = []
            for floor_name, floor_data in realtime.items():
                for eq in floor_data.get("hvac", []):
                    rules = {}
                    for pt in eq.get("points", []):
                        nav = str(pt.get("navName") or "")
                        val = pt.get("currentValue", "N/A")
                        if nav.upper().startswith("RULE_"):
                            rules[nav] = str(val)
                    if rules:
                        fdd_list.append({
                            "equip": eq.get("name", "Unknown"),
                            "floor": floor_name,
                            "alarms": len(eq.get("alarms", [])),
                            "rules": rules,
                        })
            cached_fdd_summary = fdd_list

            # 6. Build power live payload
            cached_power_data = {
                "timestamp": datetime.now().isoformat(),
                "total_power": live_results.get("total_power", 0) or 0,
                "carbon_emission": live_results.get("carbon", 0) or 0,
                "water_consumption": cached_sensor_avg.get("water", 0) or 0,
                "previous_month": live_results.get("previous_month", 0) or 0,
                "current_month": live_results.get("current_month", 0) or 0,
                "target_monthly": live_results.get("target_monthly"),
                "avg_temp": cached_sensor_avg.get("temp", 0) or 0,
                "avg_hum": cached_sensor_avg.get("humidity", 0) or 0,
                "avg_co2": cached_sensor_avg.get("co2", 0) or 0,
                "ahu": live_results.get("ahu", 0) or 0,
                "fcu": live_results.get("fcu", 0) or 0,
                "boiler": live_results.get("boiler", 0) or 0,
                "chiller": live_results.get("chiller", 0) or 0,
                "cooling_tower": live_results.get("cooling_tower", 0) or 0,
                "vav": live_results.get("vav", 0) or 0,
                "lighting": live_results.get("lighting", 0) or 0,
                "power_sockets": live_results.get("power_sockets", 0) or 0,
                "pumps": live_results.get("pumps", 0) or 0,
                "unit": "kWh",
                "power_history": cached_power_history,
                "fdd": cached_fdd_summary,
            }

            # 7. Build building info
            cached_building_data = {
                "status": "success",
                "Building_Info": {
                    "timestamp": datetime.now().isoformat(),
                    "Equipments": realtime,
                    "buildingPowerUsageHistory": power_hist,
                },
            }

            print(f"[FIN] ✓ Data refreshed at {datetime.now().strftime('%H:%M:%S')}")
            await asyncio.sleep(30)

        except Exception as e:
            print(f"[FIN] ✗ Polling error: {e}")
            await asyncio.sleep(10)


def _flatten_equip(realtime: dict) -> list[dict]:
    """Flatten floor-wise equipment into a single list for the frontend."""
    equip_list = []
    for floor_name, floor_data in realtime.items():
        for category, items in floor_data.items():
            if not isinstance(items, list):
                continue
            for eq in items:
                eq_name = eq.get("name", "")
                if any(x in eq_name.upper() for x in ["ENERGY", "USAGE", "CALC"]):
                    continue
                alarms = eq.get("alarms", [])
                equip_list.append({
                    "name": eq_name,
                    "floor": floor_name,
                    "category": category,
                    "inAlarm": len(alarms) > 0,
                    "alarms": alarms,
                    "bimId": eq.get("bimId", ""),
                    "points": eq.get("points", []),
                })
    return equip_list


def _compute_sensor_averages(realtime: dict):
    """Compute building-wide sensor averages from equipment points."""
    global cached_sensor_avg
    temp_vals, hum_vals, co2_vals = [], [], []

    for floor_data in realtime.values():
        for eq in floor_data.get("hvac", []):
            for pt in eq.get("points", []):
                nav = str(pt.get("navName") or "").lower()
                val_str = pt.get("currentValue", "")
                try:
                    num = float(re.sub(r'[^0-9.\-]', '', str(val_str)))
                except (ValueError, TypeError):
                    continue

                if "temp" in nav and 10 < num < 50:
                    temp_vals.append(num)
                elif "humid" in nav and 5 < num < 100:
                    hum_vals.append(num)
                elif "co2" in nav and 100 < num < 5000:
                    co2_vals.append(num)

    if temp_vals:
        cached_sensor_avg["temp"] = round(sum(temp_vals) / len(temp_vals), 2)
    if hum_vals:
        cached_sensor_avg["humidity"] = round(sum(hum_vals) / len(hum_vals), 2)
    if co2_vals:
        cached_sensor_avg["co2"] = round(sum(co2_vals) / len(co2_vals), 2)


# ─── FastAPI App ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    yield
    # Cleanup
    global polling_task, client
    if polling_task and not polling_task.done():
        polling_task.cancel()
    if client:
        await client.close()


app = FastAPI(
    title="FIN Connector API",
    description="Template-based FIN Framework connector for the IFC Digital Twin Viewer",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request/Response Models ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str
    server_url: Optional[str] = None
    project_name: Optional[str] = None


class StatusResponse(BaseModel):
    connected: bool
    project_name: str
    server_url: str
    display_name: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/api/fin/login")
async def login(req: LoginRequest):
    """Authenticate with FIN server using SCRAM-SHA-256."""
    global client, polling_task, FIN_SERVER_URL, PROJECT_NAME

    server_url = req.server_url or FIN_SERVER_URL
    project = req.project_name or PROJECT_NAME

    # Update globals if overridden
    FIN_SERVER_URL = server_url
    PROJECT_NAME = project

    # Stop existing polling
    if polling_task and not polling_task.done():
        polling_task.cancel()

    # Close existing client
    if client:
        await client.close()

    client = FinScramClient(server_url, project)
    success = await client.authenticate(req.username, req.password)

    if not success:
        raise HTTPException(status_code=401, detail="Authentication failed")

    # Start background polling
    polling_task = asyncio.create_task(polling_loop())

    return {
        "status": "success",
        "message": f"Authenticated to {server_url} as {req.username}",
        "project": project,
    }


@app.get("/api/fin/status", response_model=StatusResponse)
async def get_status():
    """Check connection status."""
    return StatusResponse(
        connected=client.is_authenticated if client else False,
        project_name=PROJECT_NAME,
        server_url=FIN_SERVER_URL,
        display_name=CONFIG.get("display_name", PROJECT_NAME),
    )


@app.get("/api/fin/equip-live")
async def get_equip_live():
    """Get live equipment data (floor-wise with points and alarms)."""
    if not client or not client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return cached_equip_data or {"timestamp": None, "equipment": []}


@app.get("/api/fin/power-live")
async def get_power_live():
    """Get live power/energy/sensor data."""
    if not client or not client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return cached_power_data or {}


@app.get("/api/fin/building-info")
async def get_building_info():
    """Get full building data with history."""
    if not client or not client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return cached_building_data or {}


@app.post("/api/fin/logout")
async def logout():
    """Disconnect from FIN server."""
    global client, polling_task
    if polling_task and not polling_task.done():
        polling_task.cancel()
    if client:
        await client.close()
        client = None
    return {"status": "disconnected"}


@app.get("/api/fin/config")
async def get_config():
    """Get the current config (without sensitive data)."""
    return {
        "project_name": PROJECT_NAME,
        "server_url": FIN_SERVER_URL,
        "display_name": CONFIG.get("display_name", PROJECT_NAME),
    }


# ─── Static Viewer App ────────────────────────────────────────────────────────

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
PROJECT_JSON = os.path.join(BACKEND_DIR, "project.json")


@app.get("/project.json")
async def serve_project_json():
    """Serve the project.json for the standalone viewer."""
    if os.path.exists(PROJECT_JSON):
        return FileResponse(PROJECT_JSON, media_type="application/json")
    raise HTTPException(status_code=404, detail="project.json not found")


@app.get("/thumbnail.webp")
async def serve_thumbnail():
    """Serve the project thumbnail."""
    thumb = os.path.join(BACKEND_DIR, "thumbnail.webp")
    if os.path.exists(thumb):
        return FileResponse(thumb, media_type="image/webp")
    raise HTTPException(status_code=404, detail="thumbnail not found")


@app.get("/models/{filename:path}")
async def serve_model(filename: str):
    """Serve model files (.frag / .glb) from the backend/models/ directory."""
    safe = os.path.normpath(filename)
    model_path = os.path.join(MODELS_DIR, safe)
    # Prevent path traversal
    if not model_path.startswith(MODELS_DIR):
        raise HTTPException(status_code=403, detail="Forbidden")
    if os.path.exists(model_path):
        media = "model/gltf-binary" if model_path.endswith(".glb") else "application/octet-stream"
        return FileResponse(model_path, media_type=media)
    raise HTTPException(status_code=404, detail=f"Model {filename} not found")


@app.get("/")
@app.get("/viewer.html")
async def serve_viewer():
    """Serve the viewer SPA entry point."""
    viewer_path = os.path.join(STATIC_DIR, "viewer.html")
    if os.path.exists(viewer_path):
        return FileResponse(viewer_path, media_type="text/html")
    return {"error": "Viewer not found. Make sure static/ folder is present."}


if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
