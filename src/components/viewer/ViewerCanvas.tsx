import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { useFragmentsEngine } from '@/hooks/useFragmentsEngine'
import { useModelLoader } from '@/hooks/useModelLoader'
import { useModelStore } from '@/store/useModelStore'
import { useAppStore } from '@/store/useAppStore'
import { ViewerToolbar } from './ViewerToolbar'
import { ModelPositionPanel } from '@/components/viewer/ModelPositionPanel'
import { RenderPanel } from '@/components/viewer/RenderPanel'
import { DashboardOverlay } from '@/components/viewer/DashboardOverlay'
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

  useEffect(() => {
    if (isFinProject) {
      setDashboardVisible(true)
    }
  }, [isFinProject])

  const { engineRef, isReady, error } = useFragmentsEngine(containerRef)
  const { loadModel, isLoading } = useModelLoader(engineRef)
  const models = useModelStore(s => s.models)
  const step = useAppStore(s => s.step)
  const realisticMode = useAppStore(s => s.realisticMode)
  const exposure = useAppStore(s => s.exposure)
  const lightIntensity = useAppStore(s => s.lightIntensity)
  const ambientIntensity = useAppStore(s => s.ambientIntensity)
  const timeOfDay = useAppStore(s => s.timeOfDay)
  const bloomStrength = useAppStore(s => s.bloomStrength)
  const bloomThreshold = useAppStore(s => s.bloomThreshold)
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

  useEffect(() => {
    if (isReady && onEngineReady) onEngineReady(engineRef)
  }, [isReady])

  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setLightingParams({ realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette })
    }
  }, [realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, fogDensity, cloudDensity, cloudShadowsEnabled, cloudSpeed, dofEnabled, dofFocus, dofAperture, dofMaxBlur, visualSaturation, visualTemperature, visualContrast, visualVignette, isReady])

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

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerActive) return
    const engine = engineRef.current
    if (!engine) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const meshes: THREE.Object3D[] = []
    
    // Collect standard meshes (like GLB models) that have position attributes
    engine.world.scene.three.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.visible) {
        if (mesh.scale.x > 100000) return;
        const material = mesh.material as THREE.Material;
        if (material && material.side === THREE.BackSide) return;
        
        // Only add standard meshes if they have a position attribute
        // Fragment meshes are handled separately if they lack this standard structure
        if (mesh.geometry?.attributes?.position) {
          meshes.push(obj)
        } else if ((mesh as any).isInstancedMesh || (mesh as any).isBatchedMesh || mesh.name.includes("Fragment")) {
          meshes.push(obj)
        }
      }
    })

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), engine.world.camera.three)
    
    let hits: THREE.Intersection[] = []
    
    for (const mesh of meshes) {
      try {
        const rawHits = raycaster.intersectObject(mesh, false)
        hits.push(...rawHits)
      } catch (err) {
      }
    }
    
    hits.sort((a, b) => a.distance - b.distance)
    if (hits.length > 0) {
      const p = hits[0].point
      setPickedCoord([
        parseFloat(p.x.toFixed(3)),
        parseFloat(p.y.toFixed(3)),
        parseFloat(p.z.toFixed(3)),
      ])
    }
  }, [pickerActive])

  return (
    <div className="viewer-canvas-wrapper">
      {/* Three.js mount */}
      <div
        ref={containerRef}
        className={`viewer-canvas-container${pickerActive ? ' picker-cursor' : ''}`}
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
          onTogglePicker={() => setPickerActive(v => !v)}
          dashboardVisible={dashboardVisible}
          onToggleDashboard={() => setDashboardVisible(v => !v)}
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
