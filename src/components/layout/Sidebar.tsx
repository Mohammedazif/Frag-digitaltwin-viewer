import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { useProjectStore } from '@/store/useProjectStore'
import { UploadZone } from '@/components/upload/UploadZone'
import { ConversionProgress } from '@/components/upload/ConversionProgress'
import { ModelInfoPanel } from '@/components/model/ModelInfoPanel'
import { DownloadButton } from '@/components/download/DownloadButton'
import { ProjectListPage } from '@/components/project/ProjectListPage'
import { FinLoginPanel } from '@/components/fin/FinLoginPanel'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'

interface SidebarProps {
  onFiles: (files: File[]) => void
  engineRef: React.MutableRefObject<FragmentsEngine | null>
}

export function Sidebar({ onFiles, engineRef }: SidebarProps) {
  const step = useAppStore(s => s.step)
  const conversionProgress = useAppStore(s => s.conversionProgress)
  const conversionStepLabel = useAppStore(s => s.conversionStepLabel)
  const error = useAppStore(s => s.error)
  const { reset } = useAppStore()

  const models = useModelStore(s => s.models)
  const clearModels = useModelStore(s => s.clearModels)

  const currentProject = useProjectStore(s => s.currentProject)
  const closeProject = useProjectStore(s => s.closeProject)
  const exportAsZip = useProjectStore(s => s.exportAsZip)
  const updateThumbnail = useProjectStore(s => s.updateThumbnail)
  const saveViewAndSettings = useProjectStore(s => s.saveViewAndSettings)
  const setStep = useAppStore(s => s.setStep)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportAsZip()
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearAll = async () => {
    const engine = engineRef.current

    // Capture thumbnail right before closing if we are in a project
    if (currentProject && engine) {
      const { captureCanvasThumbnail } = await import('@/lib/thumbnailCapture')
      const thumb = captureCanvasThumbnail(engine)
      if (thumb) await updateThumbnail(thumb)
    }

    if (engine && models.length > 0) {
      models.forEach(m => {
        if (m.type === 'glb') {
          const existing = engine.world.scene.three.children.find((c: any) => c.userData?.modelId === m.modelId)
          if (existing) {
            engine.world.scene.three.remove(existing)
          }
        } else {
          engine.fragments.disposeModel(m.modelId).catch(() => {})
        }
      })
    }
    clearModels()
    if (currentProject) {
      closeProject()
      setStep('projects')
    } else {
      reset()
    }
  }

  const handleAddAnother = () => {
    fileInputRef.current?.click()
  }

  const handleSaveViewAndSettings = async () => {
    if (!engineRef.current || !currentProject) return
    const engine = engineRef.current
    
    // Save thumbnail as well for good measure
    const { captureCanvasThumbnail } = await import('@/lib/thumbnailCapture')
    const thumb = captureCanvasThumbnail(engine)
    if (thumb) await updateThumbnail(thumb)

    const cameraPos = new (await import('three')).Vector3()
    const cameraTarget = new (await import('three')).Vector3()
    engine.world.camera.controls.getPosition(cameraPos)
    engine.world.camera.controls.getTarget(cameraTarget)
    
    const state = useAppStore.getState()
    const renderSettings = {
      realisticMode: state.realisticMode,
      exposure: state.exposure,
      lightIntensity: state.lightIntensity,
      ambientIntensity: state.ambientIntensity,
      timeOfDay: state.timeOfDay,
      bloomStrength: state.bloomStrength,
      bloomThreshold: state.bloomThreshold,
      fogDensity: state.fogDensity
    }

    await saveViewAndSettings(
      { position: [cameraPos.x, cameraPos.y, cameraPos.z], target: [cameraTarget.x, cameraTarget.y, cameraTarget.z] },
      renderSettings
    )
    
    // Show some brief feedback or rely on the toast, maybe just standard UI feedback
    alert('Camera view and render settings saved to project.')
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const validFiles: File[] = []
      for (let i = 0; i < files.length; i++) validFiles.push(files[i])
      onFiles(validFiles)
    }
    e.target.value = ''
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">

        {(step === 'projects') && (
          <ProjectListPage engineRef={engineRef} />
        )}

        {(step === 'idle') && (
          <UploadZone onFiles={onFiles} />
        )}

        {(step === 'uploading') && (
          <div className="sidebar-status">
            <div className="conversion-spinner" />
            <p>Reading files...</p>
          </div>
        )}

        {(step === 'converting') && (
          <ConversionProgress
            progress={conversionProgress}
            stepLabel={conversionStepLabel}
            fileName="Converting models..."
          />
        )}

        {(step === 'viewing') && (
          <>
            <ModelInfoPanel engineRef={engineRef} />
            <FinLoginPanel />
            <DownloadButton engineRef={engineRef} />
            
            {currentProject && (
              <>
                <button 
                  className="download-btn" 
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', marginBottom: '8px' }} 
                  onClick={handleSaveViewAndSettings}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Save Camera & Render View
                </button>
                <button 
                  className="download-btn" 
                  style={{ background: 'var(--text-primary)' }} 
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Export Project as ZIP
                </button>
              </>
            )}

            <button className="add-another-btn" onClick={handleAddAnother}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Add another model
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ifc,.frag,.glb,.gltf"
              multiple
              onChange={onInputChange}
              style={{ display: 'none' }}
            />
            <button className="load-another-btn" onClick={handleClearAll} style={{ marginTop: 8 }}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
              {currentProject ? 'Close project' : 'Clear all models'}
            </button>
          </>
        )}

        {(step === 'error') && (
          <div className="sidebar-error">
            <div className="sidebar-error-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p className="sidebar-error-title">Conversion failed</p>
            <p className="sidebar-error-msg">{error}</p>
            <button className="retry-btn" onClick={handleClearAll}>Try again</button>
          </div>
        )}

      </div>

      {isExporting && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="conversion-spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
          <h2 style={{ marginTop: '24px', color: 'white', fontWeight: 600, fontSize: '18px' }}>Packaging Project...</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px', fontSize: '14px' }}>Please wait while your standalone viewer is prepared.</p>
        </div>
      )}
    </aside>
  )
}
