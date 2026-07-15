import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { useFragmentsEngine } from '@/hooks/useFragmentsEngine'
import { useModelLoader } from '@/hooks/useModelLoader'
import { useMaterialOverrides } from '@/hooks/useMaterialOverrides'
import { useModelStore } from '@/store/useModelStore'
import { useAppStore } from '@/store/useAppStore'
import { ViewerToolbar } from './ViewerToolbar'
import { ModelPositionPanel } from '@/components/viewer/ModelPositionPanel'
import { RenderPanel } from '@/components/viewer/RenderPanel'
import { DashboardOverlay } from '@/components/viewer/DashboardOverlay'
import { MaterialPanel } from '@/components/viewer/MaterialPanel'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'

interface ViewerCanvasProps {
  onEngineReady?: (engineRef: React.MutableRefObject<FragmentsEngine | null>) => void
  adminMode?: boolean
  isFinProject?: boolean
}

export function ViewerCanvas({ onEngineReady, adminMode = true, isFinProject = false }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<any>(null)
  const statsContainerRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [dashboardVisible, setDashboardVisible] = useState(isFinProject)
  const [pickedCoord, setPickedCoord] = useState<[number, number, number] | null>(null)
  const materialPickerActive = useAppStore(s => s.materialPickerActive)
  const setMaterialPickerActive = useAppStore(s => s.setMaterialPickerActive)
  const selectedMaterialElement = useAppStore(s => s.selectedMaterialElement)
  const setSelectedMaterialElement = useAppStore(s => s.setSelectedMaterialElement)

  useEffect(() => {
    if (isFinProject) {
      setDashboardVisible(true)
    }
  }, [isFinProject])

  const { engineRef, isReady, error } = useFragmentsEngine(containerRef)
  const { loadModel, isLoading } = useModelLoader(engineRef)
  
  // Initialize material overrides
  useMaterialOverrides(engineRef)

  const models = useModelStore(s => s.models)
  const step = useAppStore(s => s.step)
  const realisticMode = useAppStore(s => s.realisticMode)
  const exposure = useAppStore(s => s.exposure)
  const lightIntensity = useAppStore(s => s.lightIntensity)
  const ambientIntensity = useAppStore(s => s.ambientIntensity)
  const timeOfDay = useAppStore(s => s.timeOfDay)
  const bloomStrength = useAppStore(s => s.bloomStrength)
  const bloomThreshold = useAppStore(s => s.bloomThreshold)
  const bloomEnabled = useAppStore(s => s.bloomEnabled)
  const fogDensity = useAppStore(s => s.fogDensity)
  const cloudDensity = useAppStore(s => s.cloudDensity)
  const cloudShadowsEnabled = useAppStore(s => s.cloudShadowsEnabled)
  const cloudSpeed = useAppStore(s => s.cloudSpeed)
  const dofEnabled = useAppStore(s => s.dofEnabled)
  const dofFocus = useAppStore(s => s.dofFocus)
  const dofAperture = useAppStore(s => s.dofAperture)
  const dofMaxBlur = useAppStore(s => s.dofMaxBlur)
  const visualSaturation = useAppStore(s => s.visualSaturation)
  const visualTemperature = useAppStore(s => s.visualTemperature)
  const visualContrast = useAppStore(s => s.visualContrast)
  const visualVignette = useAppStore(s => s.visualVignette)
  const godRaysEnabled = useAppStore(s => s.godRaysEnabled)
  const godRayStrength = useAppStore(s => s.godRayStrength)
  const chromaticAberration = useAppStore(s => s.chromaticAberration)
  const autoFocus = useAppStore(s => s.autoFocus)

  useEffect(() => {
    if (isReady && onEngineReady) onEngineReady(engineRef)
  }, [isReady])

  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setLightingParams({ realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, bloomEnabled, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette, godRaysEnabled, godRayStrength, chromaticAberration, autoFocus })
    }
  }, [realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, bloomEnabled, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette, godRaysEnabled, godRayStrength, chromaticAberration, autoFocus, isReady])

  const loadedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isReady) return
    const currentModels = useModelStore.getState().models
    if (currentModels.length === 0) {
      loadedIdsRef.current.clear()
    }
    currentModels.forEach(model => {
      if (model.fragBytes && !loadedIdsRef.current.has(model.modelId)) {
        loadedIdsRef.current.add(model.modelId)
        loadModel(model.fragBytes, model.modelId, model.type, {
          position: model.position,
          rotation: model.rotation,
          scale: model.scale,
        }, adminMode) 
      }
    })
  }, [models, isReady])

  useEffect(() => {
    if (!isReady || !statsContainerRef.current) return
    let Stats: any
    import('stats.js').then((mod) => {
      Stats = mod.default
      const stats = new Stats()
      stats.showPanel(0)
      stats.dom.style.position = 'absolute'
      stats.dom.style.top = '0'
      stats.dom.style.left = '0'
      setStatsVisible(prev => {
        stats.dom.style.display = prev ? 'block' : 'none'
        return prev
      })
      statsContainerRef.current?.appendChild(stats.dom)
      statsRef.current = stats

      const engine = engineRef.current
      if (engine) {
        engine.world.renderer.onBeforeUpdate.add(() => stats.begin())
        engine.world.renderer.onAfterUpdate.add(() => stats.end())
      }
    })

    return () => {
      if (statsRef.current?.dom?.parentNode) {
        statsRef.current.dom.parentNode.removeChild(statsRef.current.dom)
      }
    }
  }, [isReady])

  useEffect(() => {
    if (statsRef.current?.dom) {
      statsRef.current.dom.style.display = statsVisible ? 'block' : 'none'
    }
  }, [statsVisible])

  // Draw selection border (BoxHelper)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let boxHelper = engine.world.scene.three.getObjectByName('selection-border-helper') as THREE.Box3Helper;
    if (!boxHelper) {
      boxHelper = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0xffff00));
      boxHelper.name = 'selection-border-helper';
      boxHelper.visible = false;
      engine.world.scene.three.add(boxHelper);
    }

    if (materialPickerActive && selectedMaterialElement) {
      const { modelId, id } = selectedMaterialElement;
      const model = engine.fragments.models.list.get(modelId) as any;
      
      if (model) {
        boxHelper.visible = false;
        const getBox = async () => {
          try {
            // First try uniqube's getBoxes (Fragments v3)
            if (typeof model.getBoxes === 'function') {
              const boxes = await model.getBoxes([id]);
              if (boxes && boxes.length > 0) {
                const union = new THREE.Box3();
                for (const b of boxes) {
                  if (!b.isEmpty()) union.union(b);
                }
                if (!union.isEmpty()) {
                  if (model.object && typeof model.object.updateMatrixWorld === 'function') {
                    model.object.updateMatrixWorld(true);
                    union.applyMatrix4(model.object.matrixWorld);
                  }
                  boxHelper.box.copy(union);
                  boxHelper.box.expandByScalar(0.01);
                  boxHelper.visible = true;
                }
              }
            } else if (typeof model.getBoundingBox === 'function') {
              const box = await model.getBoundingBox([id]);
              if (box && !box.isEmpty()) {
                if (model.object && typeof model.object.updateMatrixWorld === 'function') {
                  model.object.updateMatrixWorld(true);
                  box.applyMatrix4(model.object.matrixWorld);
                }
                boxHelper.box.copy(box);
                boxHelper.box.expandByScalar(0.01);
                boxHelper.visible = true;
              }
            }
          } catch (e) {}
        }
        getBox();
      } else {
        // Fallback for GLB standard objects
        const obj = engine.world.scene.three.children.find((c: any) => c.userData?.modelId === modelId);
        if (obj) {
          const box = new THREE.Box3().setFromObject(obj);
          if (!box.isEmpty()) {
            boxHelper.box.copy(box);
            boxHelper.box.expandByScalar(0.01);
            boxHelper.visible = true;
          }
        }
      }
    } else {
      boxHelper.visible = false;
    }
  }, [selectedMaterialElement, materialPickerActive, engineRef]);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerActive && !materialPickerActive) return
    const engine = engineRef.current
    if (!engine) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const canvas = container.querySelector('canvas')
    if (canvas) {
      const canvasRect = canvas.getBoundingClientRect()
    }

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const ndc = new THREE.Vector2(x, y)
    // The library m.raycast function actually expects raw window coordinates and handles the container offset itself!
    const rawPx = new THREE.Vector2(e.clientX, e.clientY)

    let hitExpressId: string | null = null;
    let hitModelId: string | null = null;
    let hitPoint: THREE.Vector3 | null = null;
    let fragHitDistance = Infinity;

    try {
      // 0. Try OBC.Raycasters natively with EXPLICIT position!
      const casters = engine.components.get(OBC.Raycasters);
      const caster = casters.get(engine.world);
      if (caster) {
        try {
          const result = await caster.castRay({ position: ndc });
          if (result && result.object) {
            // we got a hit natively!
            hitPoint = result.point;
            let modelId = result.object.userData?.modelId;
            let curr: any = result.object;
            while (!modelId && curr.parent) {
              curr = curr.parent;
              modelId = curr.userData?.modelId;
            }
            if (!modelId) {
              for (const [id, model] of engine.fragments.models.list.entries()) {
                const m = model as any;
                if (m === result.object || m.object === result.object || m === curr || m.object === curr) {
                  modelId = id; break;
                }
              }
            }
            if (modelId) {
              hitModelId = modelId;
              hitExpressId = (result as any).localId?.toString() || result.instanceId?.toString() || (result as any).batchId?.toString() || '0';
            }
          } else {
             // Let's try with window pixel position as a sanity check for native castRay
             const pixelResult = await caster.castRay({ position: rawPx });
          }
        } catch (nativeErr) {
          console.error('[ViewerCanvas] Native castRay threw:', nativeErr);
        }
      }

      // 1. Native Fragment Raycast (Robust fallback logic)
      if (canvas) {
        for (const [modelId, m] of engine.fragments.models.list.entries()) {
          try {
            const mAny = m as any;
            if (m.object) m.object.updateMatrixWorld(true);
            if (typeof mAny.raycast === 'function') {
              let hit = await mAny.raycast({
                camera: engine.world.camera.three,
                dom: canvas,
                mouse: rawPx,
              });
              if (hit && typeof hit.localId === 'number') {
                const dist = hit.distance ?? hit.rayDistance ?? 0;
                if (dist < fragHitDistance) {
                  fragHitDistance = dist;
                  hitModelId = modelId;
                  hitExpressId = hit.localId.toString();
                  hitPoint = hit.point;
                }
              }
            }
          } catch (err) {}
        }
      }
    } catch (err) {}

    // 2. Fallback: standard THREE.Raycaster individually catching crashes
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, engine.world.camera.three)
    
    let allHits: THREE.Intersection[] = [];
    const scene = engine.world.scene.three;
    scene.updateMatrixWorld(true);
    
    scene.traverse((child: any) => {
      if (child.isMesh && child.visible && child.name !== 'SkyDome' && child.name !== 'CloudsDome') {
        try {
          const hits = raycaster.intersectObject(child, false);
          allHits.push(...hits);
        } catch (err) {
          // Ignore crashing meshes
        }
      }
    });
    
    allHits.sort((a, b) => a.distance - b.distance);
    
    // Only apply standard raycaster if native failed OR we want to force it
    if (!hitModelId) {
      let hits: THREE.Intersection[] = []
      for (const h of allHits) {
         const mesh = h.object as THREE.Mesh
         if (mesh.visible) {
             hits.push(h)
         }
      }
      hits.sort((a, b) => a.distance - b.distance)

      if (hits.length > 0) {
         const hit = hits[0]
         hitPoint = hit.point
         const mesh = hit.object as THREE.Mesh & { getItemID?: (idx: number) => string };
         console.log(`[ViewerCanvas] Standard hit mesh:`, mesh);
         
         let modelId = mesh.userData?.modelId;
         let curr: any = mesh;
         while (!modelId && curr.parent) {
           curr = curr.parent;
           modelId = curr.userData?.modelId;
         }
         
         if (!modelId) {
           for (const [id, model] of engine.fragments.models.list.entries()) {
             const m = model as any;
             if (m === mesh || m.object === mesh || m === curr || m.object === curr) {
               modelId = id; break;
             }
             if (m.children?.includes(mesh) || m.items?.some((i: any) => i.mesh === mesh)) {
               modelId = id; break;
             }
           }
         }

         if (modelId) {
            hitModelId = modelId;
            hitExpressId = hit.instanceId?.toString() || (hit as any).batchId?.toString() || (hit as any).localId?.toString() || '0';
            if (typeof mesh.getItemID === 'function' && hit.instanceId !== undefined) {
              hitExpressId = mesh.getItemID(hit.instanceId);
            }
            console.log(`[ViewerCanvas] Standard hit ACCEPTED. modelId: ${hitModelId}, expressId: ${hitExpressId}`);
         }
      }
    }

    if (hitModelId && hitExpressId) {
      if (pickerActive && hitPoint) {
         setPickedCoord([
           parseFloat(hitPoint.x.toFixed(3)),
           parseFloat(hitPoint.y.toFixed(3)),
           parseFloat(hitPoint.z.toFixed(3)),
         ])
      } else if (materialPickerActive) {
         const expressId = parseInt(hitExpressId, 10) || 0;
         
         // Start with fallback
         let resolvedCategory = 'Object';
         
         const fragModel = engine.fragments.models.list.get(hitModelId) as any;
         if (fragModel && typeof fragModel.getCategories === 'function' && typeof fragModel.getItemsByQuery === 'function') {
           fragModel.getCategories().then(async (cats: string[]) => {
             for (const cat of cats) {
               try {
                 const ids = await fragModel.getItemsByQuery({ categories: [new RegExp(cat, 'i')] });
                 if (ids && ids.includes(expressId)) {
                   resolvedCategory = cat;
                   break;
                 }
               } catch (e) {
                 // ignore
               }
             }
             
             setSelectedMaterialElement({
               modelId: hitModelId,
               id: expressId,
               category: resolvedCategory
             });
           }).catch(() => {
             // fallback
             setSelectedMaterialElement({
               modelId: hitModelId,
               id: expressId,
               category: resolvedCategory
             });
           });
         } else {
           setSelectedMaterialElement({
             modelId: hitModelId,
             id: expressId,
             category: resolvedCategory
           });
         }
      }
    }
  }, [pickerActive, materialPickerActive])

  return (
    <div className="viewer-canvas-wrapper">
      {/* Three.js mount */}
      <div
        ref={containerRef}
        className={`viewer-canvas-container${(pickerActive || materialPickerActive) ? ' picker-cursor' : ''}`}
        onClick={handleCanvasClick}
      />

      {/* Stats overlay */}
      <div ref={statsContainerRef} className="stats-overlay" />

      {/* Dashboard Overlay */}
      {step === 'viewing' && (
        <DashboardOverlay visible={dashboardVisible} />
      )}

      {/* Toolbar */}
      {step === 'viewing' && adminMode && (
        <ViewerToolbar
          engineRef={engineRef}
          onToggleStats={() => setStatsVisible(v => !v)}
          statsVisible={statsVisible}
          pickerActive={pickerActive}
          onTogglePicker={() => setPickerActive(v => {
            if (!v) setMaterialPickerActive(false)
            return !v
          })}
          dashboardVisible={dashboardVisible}
          onToggleDashboard={() => setDashboardVisible(v => !v)}
          materialPickerActive={materialPickerActive}
          onToggleMaterialPicker={() => {
            setMaterialPickerActive(!materialPickerActive)
            if (!materialPickerActive) setPickerActive(false)
          }}
        />
      )}

      {/* Right side panels */}
      {step === 'viewing' && adminMode && (
        <div className="right-panels-container">
          <RenderPanel />
          <ModelPositionPanel 
            engineRef={engineRef} 
            pickedCoord={pickedCoord}
            onClearPickedCoord={() => setPickedCoord(null)}
          />
          <MaterialPanel engineRef={engineRef} />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="viewer-overlay">
          <div className="viewer-overlay-inner">
            <div className="viewer-spinner" />
            <p>Loading model into scene...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="viewer-overlay">
          <div className="viewer-overlay-inner error">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>3D engine error</p>
            <p className="error-detail">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {step !== 'viewing' && !error && isReady && (
        <div className="viewer-empty">
          <div className="viewer-empty-inner">
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64" opacity="0.15">
              <rect x="8" y="20" width="20" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="32" y="12" width="20" height="36" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 44h44" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>Upload an IFC file to begin</p>
          </div>
        </div>
      )}
    </div>
  )
}
