import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
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
}

export function ViewerCanvas({ onEngineReady, adminMode = true }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<any>(null)
  const statsContainerRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [dashboardVisible, setDashboardVisible] = useState(false)
  const [pickedCoord, setPickedCoord] = useState<[number, number, number] | null>(null)

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

  useEffect(() => {
    if (isReady && onEngineReady) onEngineReady(engineRef)
  }, [isReady])

  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setLightingParams({ realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, fogDensity })
    }
  }, [realisticMode, exposure, lightIntensity, ambientIntensity, timeOfDay, bloomStrength, bloomThreshold, fogDensity, isReady])

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
        }, adminMode) // only auto-fit camera if we are in admin mode (studio)
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

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerActive) return
    const engine = engineRef.current
    if (!engine) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), engine.world.camera.three)

    const meshes: THREE.Object3D[] = []
    engine.world.scene.three.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) meshes.push(obj)
    })

    const hits = raycaster.intersectObjects(meshes, false)
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
      {step === 'viewing' && (
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

      {/* Right side panels — admin only */}
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
