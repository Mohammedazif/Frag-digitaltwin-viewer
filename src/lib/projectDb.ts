import { get, set, del, keys, createStore } from 'idb-keyval'
import type { ProjectMeta, ProjectModel } from '@/types'

// Only used to CACHE folder handles for "recent projects" — no actual data stored here
const handleStore = createStore('ifcviewer-handles', 'folder-handles')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FolderProject {
  meta: ProjectMeta
  handle: FileSystemDirectoryHandle
}

// ─── Handle Cache (recent projects) ──────────────────────────────────────────

export async function cacheHandle(projectId: string, handle: FileSystemDirectoryHandle, meta: ProjectMeta, thumbnail?: string) {
  await set(projectId, { handle, meta, thumbnail }, handleStore)
}

export async function getCachedHandles(): Promise<{ projectId: string; handle: FileSystemDirectoryHandle; meta?: ProjectMeta; thumbnail?: string }[]> {
  const allKeys = await keys(handleStore)
  const results: { projectId: string; handle: FileSystemDirectoryHandle; meta?: ProjectMeta; thumbnail?: string }[] = []
  for (const key of allKeys) {
    const val = await get<any>(key, handleStore)
    if (val) {
      if (val.kind === 'directory') {
        // legacy format: just the handle
        results.push({ projectId: String(key), handle: val })
      } else if (val.handle) {
        // new format: { handle, meta, thumbnail }
        results.push({ projectId: String(key), handle: val.handle, meta: val.meta, thumbnail: val.thumbnail })
      }
    }
  }
  return results
}

export async function removeCachedHandle(projectId: string) {
  await del(projectId, handleStore)
}

export async function verifyHandlePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const state = await (handle as any).queryPermission({ mode: 'readwrite' })
    if (state === 'granted') return true
    const requested = await (handle as any).requestPermission({ mode: 'readwrite' })
    return requested === 'granted'
  } catch {
    return false
  }
}

// ─── File System Operations ───────────────────────────────────────────────────

export async function writeJson(dir: FileSystemDirectoryHandle, filename: string, data: object) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const fh = await dir.getFileHandle(filename, { create: true })
      const writable = await fh.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return;
    } catch (err: any) {
      lastErr = err;
      if (err?.message?.includes('state cached in an interface object')) {
        // Wait 250ms and retry, the file might be temporarily scanned/locked by UE/AV
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function readJson<T>(dir: FileSystemDirectoryHandle, filename: string): Promise<T | null> {
  try {
    const fh = await dir.getFileHandle(filename)
    const file = await fh.getFile()
    return JSON.parse(await file.text()) as T
  } catch {
    return null
  }
}

export async function writeBinary(dir: FileSystemDirectoryHandle, filename: string, data: ArrayBuffer | Uint8Array) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const fh = await dir.getFileHandle(filename, { create: true })
      const writable = await fh.createWritable()
      await writable.write(new Blob([data as unknown as BlobPart]))
      await writable.close()
      return;
    } catch (err: any) {
      lastErr = err;
      if (err?.message?.includes('state cached in an interface object')) {
        // Wait 250ms and retry in case of external watcher lock
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function readBinary(dir: FileSystemDirectoryHandle, filename: string): Promise<ArrayBuffer | null> {
  try {
    const fh = await dir.getFileHandle(filename)
    const file = await fh.getFile()
    return await file.arrayBuffer()
  } catch {
    return null
  }
}

export async function deleteFile(dir: FileSystemDirectoryHandle, filename: string) {
  try {
    await dir.removeEntry(filename)
  } catch { /* ignore */ }
}

// ─── Project Operations ───────────────────────────────────────────────────────

/** Pick a parent folder and create a new project subfolder inside it */
export async function createProjectInFolder(name: string, isFinProject?: boolean): Promise<FolderProject | null> {
  try {
    // 1. User picks a workspace/parent folder
    const parentHandle = await (window as any).showDirectoryPicker({ 
      mode: 'readwrite',
      id: 'eko-projects'
    })
    
    // 2. Create a subfolder for this specific project
    const safeName = name.replace(/[^a-z0-9 _-]/gi, '_').trim() || 'Untitled_Project'
    const handle = await parentHandle.getDirectoryHandle(safeName, { create: true })

    // 3. Create the models directory inside the new project folder
    await handle.getDirectoryHandle('models', { create: true })

    const projectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
    const meta: ProjectMeta = {
      version: 1,
      projectId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      models: [],
      geolocation: null,
      isFinProject,
    }

    await writeJson(handle, 'project.json', meta)
    await cacheHandle(projectId, handle, meta)

    return { meta, handle }
  } catch (e: any) {
    if (e?.name === 'AbortError') return null // user cancelled
    throw e
  }
}

/** Pick an existing project folder */
export async function openProjectFolder(): Promise<FolderProject | null> {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    const meta = await readJson<ProjectMeta>(handle, 'project.json')
    if (!meta) throw new Error('No project.json found in this folder')

    // Read thumbnail if available to cache it
    let thumbnail: string | undefined
    try {
      const fh = await handle.getFileHandle('thumbnail.webp')
      const file = await fh.getFile()
      const buf = await file.arrayBuffer()
      const b64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''))
      thumbnail = `data:image/webp;base64,${b64}`
      ;(meta as any).thumbnail = thumbnail
    } catch { /* missing thumbnail, ok */ }

    await cacheHandle(meta.projectId, handle, meta, thumbnail)
    return { meta, handle }
  } catch (e: any) {
    if (e?.name === 'AbortError') return null
    throw e
  }
}

/** Load project from a cached handle, including thumbnail */
export async function loadProjectFromHandle(handle: FileSystemDirectoryHandle): Promise<ProjectMeta | null> {
  const meta = await readJson<ProjectMeta>(handle, 'project.json')
  if (!meta) return null

  // Read thumbnail.webp from disk and attach as data URL
  try {
    const fh = await handle.getFileHandle('thumbnail.webp')
    const file = await fh.getFile()
    if (file.size > 0) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      });
      (meta as any).thumbnail = dataUrl
    }
  } catch {
    // No thumbnail yet, that's fine
  }

  return meta
}

/** Save updated project.json */
export async function saveProjectMeta(handle: FileSystemDirectoryHandle, meta: ProjectMeta) {
  await writeJson(handle, 'project.json', { ...meta, updatedAt: Date.now() })
}

/** Save a .frag model binary to project/models/ */
export async function saveModelToProject(
  handle: FileSystemDirectoryHandle,
  model: ProjectModel
): Promise<string> {
  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const ext = model.type === 'glb' ? 'glb' : 'frag'
  const fileName = `${model.modelId}.${ext}`
  await writeBinary(modelsDir, fileName, model.fragBytes)
  return `models/${fileName}`
}

/** Load all model binaries listed in project.json */
export async function loadModelsFromProject(
  handle: FileSystemDirectoryHandle,
  meta: ProjectMeta
): Promise<ProjectModel[]> {
  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const results: ProjectModel[] = []

  for (const entry of meta.models) {
    const ext = entry.type === 'glb' ? 'glb' : 'frag'
    const fileName = `${entry.modelId}.${ext}`
    const bytes = await readBinary(modelsDir, fileName)
    if (bytes) {
      results.push({ ...entry, fragBytes: bytes })
    }
  }

  return results
}

/** Delete a model's .frag from disk */
export async function deleteModelFromProject(
  handle: FileSystemDirectoryHandle,
  modelId: string
) {
  try {
    const modelsDir = await handle.getDirectoryHandle('models')
    await modelsDir.removeEntry(`${modelId}.frag`)
  } catch { /* ignore if not found */ }
  try {
    const modelsDir = await handle.getDirectoryHandle('models')
    await modelsDir.removeEntry(`${modelId}.glb`)
  } catch { /* ignore if not found */ }
}

/** Save canvas thumbnail as webp */
export async function saveThumbnailToProject(handle: FileSystemDirectoryHandle, dataUrl: string) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const buf = await blob.arrayBuffer()
  await writeBinary(handle, 'thumbnail.webp', buf)
}

/** Export entire project as a ZIP blob */
export async function exportProjectAsZip(handle: FileSystemDirectoryHandle, meta: ProjectMeta): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Project metadata and models go inside backend/ so FastAPI can serve them
  zip.file('backend/project.json', JSON.stringify(meta, null, 2))

  // Thumbnail
  try {
    const thumbFh = await handle.getFileHandle('thumbnail.webp')
    const thumbFile = await thumbFh.getFile()
    zip.file('backend/thumbnail.webp', await thumbFile.arrayBuffer())
  } catch { /* no thumbnail yet */ }

  // Models — placed inside backend/models/ so FastAPI /models/{filename} route serves them
  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const backendModelsFolder = zip.folder('backend/models')!
  for (const entry of meta.models) {
    const ext = entry.type === 'glb' ? 'glb' : 'frag'
    const fileName = `${entry.modelId}.${ext}`
    const bytes = await readBinary(modelsDir, fileName)
    if (bytes) backendModelsFolder.file(fileName, bytes)
  }

  // Include Built Viewer App + Backend
  try {
    const res = await fetch('/viewer-assets.json?t=' + Date.now(), { cache: 'no-store' })
    if (res.ok) {
      const files: { path: string, content: string }[] = await res.json()
      for (const f of files) {
        if (f.path === 'index.html') continue // Skip the studio app entry
        // Place all viewer static assets inside backend/static/ so FastAPI can serve them
        zip.file(`backend/static/${f.path}`, f.content, { base64: true })
      }
    } else {
      console.warn("Viewer assets not bundled. You must run `npm run build` in the studio first.")
    }

    // Bundle backend Python files
    const backendFiles = [
      { name: 'main.py', url: '/backend/main.py' },
      { name: 'fin_client.py', url: '/backend/fin_client.py' },
      { name: 'config.json', url: '/backend/config.json' },
      { name: 'requirements.txt', url: '/backend/requirements.txt' },
    ]
    for (const bf of backendFiles) {
      try {
        const r = await fetch(bf.url + '?t=' + Date.now(), { cache: 'no-store' })
        if (r.ok) {
          const text = await r.text()
          zip.file(`backend/${bf.name}`, text)
        }
      } catch { /* skip if not available */ }
    }

    // Launch script: installs deps and starts the FastAPI backend (serves viewer + API)
    const winBat = [
      '@echo off',
      'echo ============================================',
      'echo   EKO Digital Twin Viewer + FIN Backend',
      'echo ============================================',
      'echo.',
      'echo Checking Python...',
      'python --version >nul 2>&1 || (echo Python not found. Please install Python 3.10+ && pause && exit /b 1)',
      'echo.',
      'echo Installing backend dependencies...',
      'cd /d "%~dp0backend"',
      'pip install -r requirements.txt --quiet',
      'echo.',
      'echo Starting server on http://127.0.0.1:8000/viewer.html',
      'echo Press Ctrl+C to stop.',
      'echo.',
      'start http://127.0.0.1:8000/viewer.html',
      'python -m uvicorn main:app --host 127.0.0.1 --port 8000',
      'pause',
    ].join('\r\n')

    zip.file('Start_Viewer_Windows.bat', winBat)
  } catch (err) {
    console.error("Failed to include viewer assets in zip", err)
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
}

/** Export FIN Project as a lightweight static viewer ZIP */
export async function exportFinProjectAsZip(handle: FileSystemDirectoryHandle, meta: ProjectMeta): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // 1. Add project config and models at the root
  // Force finDirectMode to true for the FIN standalone viewer since there is no backend
  const finMeta = { ...meta, apiSettings: { ...(meta.apiSettings || {}), finDirectMode: true } }
  zip.file('project.json', JSON.stringify(finMeta, null, 2))

  // Also include api-config.json for standalone FIN dashboard (direct API mode)
  const apiSettings = meta.apiSettings || {}
  const apiConfig = {
    project_name: apiSettings.finProjectName || meta.name,
    fin_server_url: apiSettings.finBaseUrl || 'https://localhost',
    direct_mode: true, // Always true for FIN standalone viewer
    polling_interval: apiSettings.finInterval || 5000,
    live_point_ids: apiSettings.finLivePoints || {},
    power_endpoints: apiSettings.finEndpoints || {},
    weather: {
      lat: apiSettings.weatherLat ?? 24.469,
      lon: apiSettings.weatherLon ?? 54.358,
      apiKey: apiSettings.weatherApiKey || '88214bff7aa566e9f6ff1ba5db38f65f',
    },
    navButtons: apiSettings.navButtons,
    leftCards: apiSettings.leftCards,
    rightCards: apiSettings.rightCards,
    sideButtons: apiSettings.sideButtons,
  }
  zip.file('api-config.json', JSON.stringify(apiConfig, null, 2))

  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const zipModelsFolder = zip.folder('models')!
  for (const entry of meta.models) {
    const ext = entry.type === 'glb' ? 'glb' : 'frag'
    const fileName = `${entry.modelId}.${ext}`
    const bytes = await readBinary(modelsDir, fileName)
    if (bytes) zipModelsFolder.file(fileName, bytes)
  }

  try {
    const thumbFh = await handle.getFileHandle('thumbnail.webp')
    const thumbFile = await thumbFh.getFile()
    zip.file('thumbnail.webp', await thumbFile.arrayBuffer())
  } catch { /* no thumbnail yet */ }

  // 2. Add static Viewer App directly to root structure (No backend)
  try {
    const res = await fetch('/viewer-assets.json?t=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) {
      throw new Error("Viewer assets not bundled. You must run `npm run build` in the studio first.")
    }

    const files: { path: string, content: string }[] = await res.json()
    for (const f of files) {
      if (f.path === 'index.html') continue // Skip main studio app
      
      if (f.path === 'viewer.html') {
        // Rename viewer.html to index.html and fix paths to be relative for static serving
        let htmlContent = atob(f.content)
        htmlContent = htmlContent.replace(/(href|src)="\/assets\//g, '$1="assets/')
        htmlContent = htmlContent.replace(/(href|src)="\/vite\.svg"/g, '$1="vite.svg"')
        zip.file('index.html', htmlContent)
      } else {
        // e.g. assets/viewer-123.js
        zip.file(f.path, f.content, { base64: true })
      }
    }
  } catch (err) {
    console.error("Failed to include viewer assets in FIN zip", err)
    throw new Error("Failed to bundle static viewer assets. Check console.")
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
}

