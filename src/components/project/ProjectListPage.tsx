import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { loadModelsFromProject } from '@/lib/projectDb'
import type { ProjectMeta } from '@/types'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import * as THREE from 'three'

interface ProjectListPageProps {
  engineRef?: React.MutableRefObject<FragmentsEngine | null>
}

export function ProjectListPage({ engineRef }: ProjectListPageProps) {
  const {
    recentProjects,
    isLoading,
    loadRecentProjects,
    createProject,
    openProject,
    openRecentProject,
    deleteRecentProject,
    exportAsZip
  } = useProjectStore()

  const setStep = useAppStore(s => s.setStep)
  const setRealisticMode = useAppStore(s => s.setRealisticMode)
  const setLightingParams = useAppStore(s => s.setLightingParams)
  const addModel = useModelStore(s => s.addModel)
  const [newProjectName, setNewProjectName] = useState('')
  const [isFinProject, setIsFinProject] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  const handleCreate = async () => {
    const name = newProjectName.trim() || `Project ${recentProjects.length + 1}`
    const meta = await createProject(name, isFinProject)
    if (meta) {
      setNewProjectName('')
      setIsFinProject(false)
      setShowNewForm(false)
      setStep('idle') // Switch to upload zone
    }
  }

  const handleOpenExistingFolder = async () => {
    const meta = await openProject()
    if (meta) {
      await loadModelsForProject(meta)
    }
  }

  const handleOpenRecent = async (meta: ProjectMeta, handle: FileSystemDirectoryHandle) => {
    setOpeningId(meta.projectId)
    try {
      const openedMeta = await openRecentProject(handle)
      if (openedMeta) {
        await loadModelsForProject(openedMeta)
      }
    } finally {
      setOpeningId(null)
    }
  }

  const loadModelsForProject = async (meta: ProjectMeta) => {
    const { folderHandle } = useProjectStore.getState()
    if (!folderHandle) return

    const projectModels = await loadModelsFromProject(folderHandle, meta)
    for (const pm of projectModels) {
      addModel({
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
      })
    }
    
    // Restore settings if present
    if (meta.renderSettings) {
      setRealisticMode(meta.renderSettings.realisticMode)
      setLightingParams(meta.renderSettings)
    }

    // Reset UI panels when loading a new project
    useAppStore.getState().setMaterialPickerActive(false)
    useAppStore.getState().setSelectedMaterialElement(null)
    useModelStore.getState().setActiveModelId(null)

    // Set viewing step first so RenderPanel and others mount if needed
    setStep('viewing')

    // Restore camera position if present (give it a small delay to ensure engine is fully ready)
    if (meta.camera && engineRef?.current) {
      setTimeout(() => {
        const engine = engineRef.current
        if (engine && meta.camera) {
          try {
            if (engine.world.camera.controls) {
              engine.world.camera.controls.setLookAt(
                meta.camera.position[0], meta.camera.position[1], meta.camera.position[2],
                meta.camera.target[0], meta.camera.target[1], meta.camera.target[2],
                false
              )
            }
          } catch (e) {
            console.warn('Failed to restore camera position:', e)
          }
        }
      }, 500)
    }
  }

  const handleDeleteRecent = async (projectId: string) => {
    await deleteRecentProject(projectId)
    setDeletingId(null)
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="project-list-loading">
        <div className="conversion-spinner" />
        <p>Loading recent projects...</p>
      </div>
    )
  }

  return (
    <div className="project-list-page">
      <div className="project-list-header">
        <div>
          <h2 className="project-list-title">Projects</h2>
          <p className="project-list-subtitle">Open or create an IFC project</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button className="project-new-btn" onClick={() => setShowNewForm(true)} style={{ flex: 1, justifyContent: 'center' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
          </svg>
          Create New Folder
        </button>
        <button className="project-new-btn" onClick={handleOpenExistingFolder} style={{ flex: 1, justifyContent: 'center', background: 'var(--bg-raised)', color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
          </svg>
          Open Folder
        </button>
      </div>

      {showNewForm && (
        <div className="project-new-form">
          <input
            className="project-name-input"
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px' }}>
            <input 
              type="checkbox" 
              id="fin-project-checkbox"
              checked={isFinProject}
              onChange={e => setIsFinProject(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="fin-project-checkbox" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Create as FIN Viewer Project
            </label>
          </div>
          <div className="project-new-form-actions">
            <button className="project-form-btn primary" onClick={handleCreate}>Select Location</button>
            <button className="project-form-btn" onClick={() => setShowNewForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {recentProjects.length > 0 && (
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>
          Recent Projects
        </h3>
      )}

      {recentProjects.length === 0 && !showNewForm ? (
        <div className="project-empty">
          <svg viewBox="0 0 64 64" fill="none" width="48" height="48" opacity="0.3">
            <rect x="8" y="16" width="48" height="36" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 24h48" stroke="currentColor" strokeWidth="2"/>
            <rect x="24" y="32" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <p className="project-empty-title">No recent projects</p>
          <p className="project-empty-hint">Create a new folder or open an existing project folder</p>
        </div>
      ) : (
        <div className="project-grid">
          {recentProjects.map(({ meta, handle }) => (
            <ProjectCard
              key={meta.projectId}
              project={meta}
              isOpening={openingId === meta.projectId}
              isDeleting={deletingId === meta.projectId}
              onOpen={() => handleOpenRecent(meta, handle)}
              onRemoveRecent={() => setDeletingId(meta.projectId)}
              onConfirmRemove={() => handleDeleteRecent(meta.projectId)}
              onCancelRemove={() => setDeletingId(null)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ProjectCardProps {
  project: ProjectMeta
  isOpening: boolean
  isDeleting: boolean
  onOpen: () => void
  onRemoveRecent: () => void
  onConfirmRemove: () => void
  onCancelRemove: () => void
  formatDate: (ts: number) => string
}

function ProjectCard({
  project, isOpening, isDeleting,
  onOpen, onRemoveRecent, onConfirmRemove, onCancelRemove,
  formatDate
}: ProjectCardProps) {
  // NOTE: For File System API, we don't have the thumbnail dataURL directly inside project.json usually, 
  // but if we store a lightweight thumbnail dataURL in the meta, it works. 
  // Let's assume we read it from meta if present.
  const thumbnail = (project as any).thumbnail

  return (
    <div className={`project-card ${isOpening ? 'opening' : ''}`}>
      {/* Thumbnail */}
      <div className="project-card-thumb" onClick={onOpen}>
        {thumbnail ? (
          <img src={thumbnail} alt={project.name} />
        ) : (
          <div className="project-card-thumb-empty">
            <svg viewBox="0 0 48 48" fill="none" width="32" height="32" opacity="0.2">
              <rect x="6" y="14" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="24" y="8" width="14" height="26" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 32h36" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        )}
        {isOpening && (
          <div className="project-card-loading">
            <div className="conversion-spinner" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="project-card-body">
        <h3 className="project-card-name" title={project.name}>{project.name}</h3>
        <div className="project-card-meta">
          <span style={{ fontFamily: 'var(--font-mono)' }}>{project.models?.length || 0}</span> model{(project.models?.length !== 1) ? 's' : ''}
          <span className="project-card-meta-sep">·</span>
          {formatDate(project.updatedAt)}
          {project.isFinProject && (
            <>
              <span className="project-card-meta-sep">·</span>
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>FIN</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="project-card-actions">
        {isDeleting ? (
          <div className="project-card-confirm">
            <span className="project-card-confirm-text" title="Remove from recent (does not delete files)">Remove?</span>
            <button className="project-card-action-btn danger" onClick={onConfirmRemove} title="Confirm remove">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <button className="project-card-action-btn" onClick={onCancelRemove} title="Cancel">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        ) : (
          <>
            <button className="project-card-action-btn" onClick={onOpen} title="Open project">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
              </svg>
            </button>
            <div style={{ flex: 1 }} />
            <button className="project-card-action-btn danger" onClick={onRemoveRecent} title="Remove from recent projects">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
