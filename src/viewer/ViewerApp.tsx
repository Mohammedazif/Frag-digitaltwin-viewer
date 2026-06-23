import { useRef, useCallback, useState, useEffect } from 'react'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { loadProjectFromHandle, loadModelsFromProject } from '@/lib/projectDb'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { LoadedModel, ProjectMeta } from '@/types'

export default function ViewerApp() {
  const engineRef = useRef<FragmentsEngine | null>(null)
  const setStep = useAppStore(s => s.setStep)
  const setRealisticMode = useAppStore(s => s.setRealisticMode)
  const setLightingParams = useAppStore(s => s.setLightingParams)
  const addModel = useModelStore(s => s.addModel)
  const models = useModelStore(s => s.models)

  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Apply saved render settings from project.json
  const applyRenderSettings = useCallback((meta: ProjectMeta) => {
    if (meta.renderSettings) {
      setRealisticMode(meta.renderSettings.realisticMode)
      setLightingParams(meta.renderSettings)
    }
  }, [setRealisticMode, setLightingParams])

  // Apply saved camera position after engine is ready
  const applyCameraPosition = useCallback((meta: ProjectMeta) => {
    if (!meta.camera) return
    const tryApply = (attempts = 0) => {
      const engine = engineRef.current
      if (engine && meta.camera) {
        engine.world.camera.controls.setLookAt(
          meta.camera.position[0], meta.camera.position[1], meta.camera.position[2],
          meta.camera.target[0], meta.camera.target[1], meta.camera.target[2],
          false
        )
      } else if (attempts < 20) {
        setTimeout(() => tryApply(attempts + 1), 300)
      }
    }
    setTimeout(() => tryApply(), 500)
  }, [])

  // Manual folder picker (fallback if auto-load fails)
  const handleOpenProject = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const handle = await (window as any).showDirectoryPicker()
      const meta = await loadProjectFromHandle(handle)

      if (!meta) {
        setError('No project.json found in this folder')
        setIsLoading(false)
        return
      }

      setProjectMeta(meta)
      applyRenderSettings(meta)

      const projectModels = await loadModelsFromProject(handle, meta)
      for (const pm of projectModels) {
        const model: LoadedModel = {
          modelId: pm.modelId,
          originalFileName: pm.originalFileName,
          originalFileSizeBytes: pm.originalFileSizeBytes,
          convertedFileSizeBytes: pm.convertedFileSizeBytes,
          conversionTimeMs: pm.conversionTimeMs,
          fragBytes: pm.fragBytes,
          type: pm.type,
          position: pm.position,
          rotation: pm.rotation,
          scale: pm.scale,
        }
        addModel(model)
      }
      setStep('viewing')
      applyCameraPosition(meta)
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message ?? 'Failed to open project')
      }
    } finally {
      setIsLoading(false)
    }
  }, [addModel, setStep, applyRenderSettings, applyCameraPosition])

  const handleEngineReady = useCallback(
    (ref: React.MutableRefObject<FragmentsEngine | null>) => {
      engineRef.current = ref.current
    },
    []
  )

  // Auto-load: fetches project.json and models/ from the FastAPI backend
  useEffect(() => {
    let mounted = true
    async function autoLoad() {
      try {
        setIsLoading(true)

        // Retry up to 3 times (server may still be starting)
        let res: Response | null = null
        for (let i = 0; i < 3; i++) {
          try {
            res = await fetch('project.json?t=' + Date.now(), { cache: 'no-store' })
            if (res.ok) break
          } catch (e) {
            if (i === 2) throw e
            await new Promise(r => setTimeout(r, 800))
          }
        }

        if (!res || !res.ok) throw new Error('project.json not found')

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/html')) {
          throw new Error('Received HTML instead of JSON — not running in standalone mode.')
        }

        const meta = (await res.json()) as ProjectMeta
        if (!mounted) return

        setProjectMeta(meta)
        applyRenderSettings(meta)

        // Load each model via HTTP (FastAPI serves /models/{filename})
        for (const m of meta.models) {
          if (!m.fragFile) continue
          try {
            const modelRes = await fetch(m.fragFile + '?t=' + Date.now(), { cache: 'no-store' })
            if (!modelRes.ok) {
              console.warn(`Failed to fetch model ${m.fragFile}: ${modelRes.status}`)
              continue
            }
            const buffer = await modelRes.arrayBuffer()
            const model: LoadedModel = {
              modelId: m.modelId,
              originalFileName: m.originalFileName,
              originalFileSizeBytes: m.originalFileSizeBytes,
              convertedFileSizeBytes: buffer.byteLength,
              conversionTimeMs: m.conversionTimeMs,
              fragBytes: buffer,
              type: m.type,
              position: m.position,
              rotation: m.rotation,
              scale: m.scale,
            }
            if (mounted) addModel(model)
          } catch (modelErr) {
            console.warn(`Could not load model ${m.fragFile}:`, modelErr)
          }
        }

        if (mounted) {
          setStep('viewing')
          applyCameraPosition(meta)
        }
      } catch (e: any) {
        // Expected in dev server — silently ignore, show manual picker instead
        console.info('Auto-load skipped (dev mode or error):', e.message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    autoLoad()
    return () => { mounted = false }
  }, [addModel, setStep, applyRenderSettings, applyCameraPosition])

  const hasModels = models.length > 0

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <svg className="header-logo" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="16" width="10" height="12" fill="#186d4e" opacity="0.9"/>
            <rect x="16" y="10" width="10" height="18" fill="#186d4e" opacity="0.6"/>
            <rect x="10" y="6" width="6" height="10" fill="#186d4e" opacity="0.4"/>
            <polygon points="4,16 9,8 14,16" fill="#0e4937" opacity="0.8"/>
          </svg>
          <div>
            <h1 className="header-title">
              {projectMeta ? projectMeta.name : 'EKO Digital Twin Viewer'}
            </h1>
            <p className="header-subtitle">
              {projectMeta
                ? `${projectMeta.models.length} model${projectMeta.models.length !== 1 ? 's' : ''}`
                : 'View · Explore'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {hasModels && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {models.length} loaded
            </span>
          )}
        </div>
      </header>

      {/* Body — no sidebar, no edit panels */}
      <div className="app-body">
        <main className="app-main">
          {/* adminMode=false hides RenderPanel + ModelPositionPanel */}
          <ViewerCanvas onEngineReady={handleEngineReady} adminMode={false} />

          {/* Open Project overlay — shown only when auto-load fails */}
          {!hasModels && !isLoading && (
            <div className="viewer-overlay" style={{ background: 'rgba(245,246,248,0.92)' }}>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '40px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              }}>
                <svg viewBox="0 0 64 64" fill="none" width="56" height="56" style={{ margin: '0 auto 20px', display: 'block', opacity: 0.3 }}>
                  <rect x="8" y="20" width="20" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <rect x="32" y="12" width="20" height="36" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 44h44" stroke="currentColor" strokeWidth="2"/>
                </svg>

                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  Open Project
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                  Select the project folder to load the 3D models.
                </p>

                {error && (
                  <div className="upload-error" style={{ marginBottom: 16, justifyContent: 'center' }}>
                    <span>⚠</span> {error}
                  </div>
                )}

                <button
                  className="download-btn"
                  onClick={handleOpenProject}
                  disabled={isLoading}
                  style={{ width: '100%' }}
                >
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                    </svg>
                    Select Project Folder
                  </>
                </button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="viewer-overlay" style={{ background: 'rgba(245,246,248,0.92)' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="conversion-spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading project…</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
