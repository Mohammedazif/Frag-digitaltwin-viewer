import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import { useFragmentsEngine } from '@/hooks/useFragmentsEngine'
import { useModelLoader } from '@/hooks/useModelLoader'
import { useMaterialOverrides } from '@/hooks/useMaterialOverrides'
import { useModelStore } from '@/store/useModelStore'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
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
  const ambientOcclusion = useAppStore(s => s.ambientOcclusion)
  const outlineEdges = useAppStore(s => s.outlineEdges)
  const pbrMaterials = useAppStore(s => s.pbrMaterials)

  useEffect(() => {
    if (isReady && onEngineReady) onEngineReady(engineRef)
  }, [isReady])

  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setLightingParams({ realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, bloomEnabled, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette, godRaysEnabled, godRayStrength, chromaticAberration, autoFocus, ambientOcclusion, outlineEdges, pbrMaterials })
    }
  }, [realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, bloomEnabled, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette, godRaysEnabled, godRayStrength, chromaticAberration, autoFocus, ambientOcclusion, outlineEdges, pbrMaterials, isReady])

  const loadedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isReady) return
    const currentModels = useModelStore.getState().models
    const hasCamera = !!useProjectStore.getState().currentProject?.camera
    if (currentModels.length === 0) {
      loadedIdsRef.current.clear()
    }

    const loadSequentially = async () => {
      for (const model of currentModels) {
        if (model.fragBytes && !loadedIdsRef.current.has(model.modelId)) {
          loadedIdsRef.current.add(model.modelId)
          await loadModel(model.fragBytes, model.modelId, model.type, {
            position: model.position,
            rotation: model.rotation,
            scale: model.scale,
          }, adminMode && !hasCamera) 
        }
      }
    }

    loadSequentially()
  }, [models, isReady])

  useEffect(() => {
    // Reset picker panels when a new project loads or when we leave the viewer
    setPickerActive(false)
    useAppStore.getState().setMaterialPickerActive(false)
  }, [useProjectStore.getState().currentProject?.projectId])

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

  // Draw selection edges (EdgesGeometry for both IFC and GLB)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let glbEdges = engine.world.scene.three.getObjectByName('glb-selection-edges') as THREE.LineSegments;
    if (!glbEdges) {
      glbEdges = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false }));
      glbEdges.name = 'glb-selection-edges';
      glbEdges.visible = false;
      engine.world.scene.three.add(glbEdges);
    }

    if (materialPickerActive && selectedMaterialElement) {
      const { modelId, id } = selectedMaterialElement;
      const model = engine.fragments.models.list.get(modelId) as any;
      
      glbEdges.visible = false;

      if (model && typeof model.getItemsGeometry === 'function') {
        const fetchEdges = async () => {
          try {
            const geometries = await model.getItemsGeometry([id]);
            if (geometries && geometries[0] && geometries[0].length > 0) {
              let totalPositions = 0;
              let totalIndices = 0;
              for (const meshData of geometries[0]) {
                if (!meshData.positions) continue;
                totalPositions += meshData.positions.length / 3;
                totalIndices += meshData.indices ? meshData.indices.length : meshData.positions.length / 3;
              }

              if (totalPositions > 0) {
                const posArray = new Float32Array(totalPositions * 3);
                const indexArray = new Uint32Array(totalIndices);

                let posOffset = 0;
                let idxOffset = 0;
                let vertexOffset = 0;
                const tempVec = new THREE.Vector3();

                for (const meshData of geometries[0]) {
                  if (!meshData.positions) continue;
                  
                  let matrix = new THREE.Matrix4();
                  if (meshData.transform instanceof THREE.Matrix4) {
                    matrix.copy(meshData.transform);
                  } else if (Array.isArray(meshData.transform)) {
                    matrix.fromArray(meshData.transform);
                  } else if ((meshData.transform as any).elements) {
                    matrix.fromArray((meshData.transform as any).elements);
                  }
                  
                  const pos = meshData.positions;
                  for (let i = 0; i < pos.length; i += 3) {
                    tempVec.set(pos[i], pos[i + 1], pos[i + 2]);
                    tempVec.applyMatrix4(matrix);
                    posArray[posOffset++] = tempVec.x;
                    posArray[posOffset++] = tempVec.y;
                    posArray[posOffset++] = tempVec.z;
                  }
                  
                  if (meshData.indices) {
                    for (let i = 0; i < meshData.indices.length; i++) {
                      indexArray[idxOffset++] = meshData.indices[i] + vertexOffset;
                    }
                  } else {
                    for (let i = 0; i < pos.length / 3; i++) {
                      indexArray[idxOffset++] = i + vertexOffset;
                    }
                  }
                  vertexOffset += pos.length / 3;
                }

                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
                geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
                
                glbEdges.geometry.dispose();
                glbEdges.geometry = new THREE.EdgesGeometry(geom);
                
                // IF the model itself has a transform (like when positioned in the scene), apply it to the mesh matrix
                if (model.object && model.object.matrixWorld) {
                   glbEdges.matrix.copy(model.object.matrixWorld);
                } else {
                   glbEdges.matrix.identity();
                }
                glbEdges.matrixAutoUpdate = false;
                glbEdges.visible = true;
              }
            }
          } catch (e) {
            console.warn('[ViewerCanvas] Failed to extract edges for IFC element:', e);
          }
        };
        fetchEdges();
      } else {
        // Fallback for GLB standard objects
        const obj = engine.world.scene.three.children.find((c: any) => c.userData?.modelId === modelId);
        if (obj) {
          let mesh: THREE.Mesh | null = null;
          obj.traverse((child: any) => {
            if (child.isMesh && !mesh) mesh = child;
          });
          if (mesh) {
            glbEdges.geometry.dispose();
            glbEdges.geometry = new THREE.EdgesGeometry(mesh.geometry);
            glbEdges.matrix.copy(mesh.matrixWorld);
            glbEdges.matrixAutoUpdate = false;
            glbEdges.visible = true;
          }
        }
      }
    } else {
      if (glbEdges) glbEdges.visible = false;
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
        // Check if any parent is hidden
        let isVisible = true;
        let curr = child;
        while (curr) {
            if (curr.visible === false) {
                isVisible = false;
                break;
            }
            curr = curr.parent;
        }
        
        if (isVisible) {
          try {
            const hits = raycaster.intersectObject(child, false);
            allHits.push(...hits);
          } catch (err) {
            // Ignore crashing meshes
          }
        }
      }
    });
    
    allHits.sort((a, b) => a.distance - b.distance);
    
    let stdHitModelId: string | null = null;
    let stdHitExpressId: string | null = null;
    let stdHitPoint: THREE.Vector3 | null = null;
    let stdHitDistance = Infinity;

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
       stdHitDistance = hit.distance;
       stdHitPoint = hit.point;
       const mesh = hit.object as THREE.Mesh & { getItemID?: (idx: number) => string };
       
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
          stdHitModelId = modelId;
          
          let expressId = mesh.userData?.expressId;
          if (mesh.userData?.faceToExpressId && hit.faceIndex !== undefined) {
             expressId = mesh.userData.faceToExpressId[hit.faceIndex];
          }
          
          stdHitExpressId = expressId?.toString() || hit.instanceId?.toString() || (hit as any).batchId?.toString() || (hit as any).localId?.toString() || '0';
          if (typeof mesh.getItemID === 'function' && hit.instanceId !== undefined) {
            stdHitExpressId = mesh.getItemID(hit.instanceId);
          }
       }
    }

    if (stdHitModelId && stdHitExpressId && stdHitDistance < fragHitDistance) {
       hitModelId = stdHitModelId;
       hitExpressId = stdHitExpressId;
       if (stdHitPoint) hitPoint = stdHitPoint;
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
          onTogglePicker={() => {
            setPickerActive(!pickerActive)
            if (!pickerActive) setMaterialPickerActive(false)
          }}
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
        <div className="right-panels-container" key={useProjectStore.getState().currentProject?.projectId || 'empty'}>
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
