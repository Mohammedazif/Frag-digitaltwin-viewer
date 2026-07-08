import { create } from 'zustand'
import type { ProjectMeta, ProjectModelEntry, LoadedModel } from '@/types'
import {
  createProjectInFolder,
  openProjectFolder,
  loadProjectFromHandle,
  loadModelsFromProject,
  saveProjectMeta,
  saveModelToProject,
  deleteModelFromProject,
  saveThumbnailToProject,
  exportProjectAsZip,
  getCachedHandles,
  verifyHandlePermission,
  removeCachedHandle,
  cacheHandle,
} from '@/lib/projectDb'

interface RecentProject {
  meta: ProjectMeta
  handle: FileSystemDirectoryHandle
}

interface ProjectState {
  currentProject: ProjectMeta | null
  folderHandle: FileSystemDirectoryHandle | null
  recentProjects: RecentProject[]
  isDirty: boolean
  isLoading: boolean

  // Actions
  loadRecentProjects: () => Promise<void>
  createProject: (name: string, isFinProject?: boolean) => Promise<ProjectMeta | null>
  openProject: () => Promise<ProjectMeta | null>
  openRecentProject: (handle: FileSystemDirectoryHandle) => Promise<ProjectMeta | null>
  closeProject: () => void
  saveProject: () => Promise<void>
  deleteRecentProject: (projectId: string) => Promise<void>
  exportAsZip: () => Promise<void>
  exportFinProjectAsZip: () => Promise<void>

  // Model management within project
  addModelEntry: (model: LoadedModel) => Promise<ProjectModelEntry | null>
  removeModelEntry: (modelId: string) => Promise<void>
  updateModelTransform: (modelId: string, transform: { position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number] }) => Promise<void>
  updateThumbnail: (dataUrl: string) => Promise<void>
  saveViewAndSettings: (camera: import('@/types').ProjectCamera, renderSettings: import('@/types').ProjectRenderSettings) => Promise<void>
  setDirty: (dirty: boolean) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  folderHandle: null,
  recentProjects: [],
  isDirty: false,
  isLoading: false,

  loadRecentProjects: async () => {
    set({ isLoading: true })
    const cached = await getCachedHandles()
    const valid: RecentProject[] = []
    const seenIds = new Set<string>()

    for (const { projectId, handle, meta: cachedMeta, thumbnail: cachedThumb } of cached) {
      try {
        let meta = await loadProjectFromHandle(handle)
        
        if (!meta && cachedMeta) {
          meta = cachedMeta
          if (cachedThumb) (meta as any).thumbnail = cachedThumb
        }

        if (meta) {
          if (seenIds.has(meta.projectId) || meta.projectId !== projectId) {
            await removeCachedHandle(projectId)
          }

          if (!seenIds.has(meta.projectId)) {
            seenIds.add(meta.projectId)
            valid.push({ meta, handle })
          }
        }
      } catch {
        await removeCachedHandle(projectId)
      }
    }
    valid.sort((a, b) => b.meta.updatedAt - b.meta.updatedAt)
    set({ recentProjects: valid, isLoading: false })
  },

  createProject: async (name: string, isFinProject?: boolean) => {
    const result = await createProjectInFolder(name, isFinProject)
    if (!result) return null
    const { meta, handle } = result

    // Refresh recent list
    const recent = get().recentProjects
    set({
      currentProject: meta,
      folderHandle: handle,
      isDirty: false,
      recentProjects: [{ meta, handle }, ...recent],
    })
    return meta
  },

  openProject: async () => {
    const result = await openProjectFolder()
    if (!result) return null
    const { meta, handle } = result

    const recent = get().recentProjects.filter(r => r.meta.projectId !== meta.projectId)
    set({
      currentProject: meta,
      folderHandle: handle,
      isDirty: false,
      recentProjects: [{ meta, handle }, ...recent],
    })
    return meta
  },

  openRecentProject: async (handle: FileSystemDirectoryHandle) => {
    const ok = await verifyHandlePermission(handle)
    if (!ok) return null
    const meta = await loadProjectFromHandle(handle)
    if (!meta) return null

    await cacheHandle(meta.projectId, handle, meta, (meta as any).thumbnail)

    const recent = get().recentProjects.filter(r => r.meta.projectId !== meta.projectId)
    set({
      currentProject: meta,
      folderHandle: handle,
      isDirty: false,
      recentProjects: [{ meta, handle }, ...recent],
    })
    return meta
  },

  closeProject: () => {
    set({ currentProject: null, folderHandle: null, isDirty: false })
  },

  saveProject: async () => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return
    const updated = { ...currentProject, updatedAt: Date.now() }
    await saveProjectMeta(folderHandle, updated)
    await cacheHandle(updated.projectId, folderHandle, updated, (updated as any).thumbnail)

    const recent = get().recentProjects.map(r =>
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    set({ currentProject: updated, isDirty: false, recentProjects: recent })
  },

  deleteRecentProject: async (projectId: string) => {
    await removeCachedHandle(projectId)
    const recent = get().recentProjects.filter(r => r.meta.projectId !== projectId)
    set({ recentProjects: recent })
  },

  exportAsZip: async () => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return

    const blob = await exportProjectAsZip(folderHandle, currentProject)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentProject.name.replace(/[^a-z0-9]/gi, '_')}_project.zip`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportFinProjectAsZip: async () => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return

    const { exportFinProjectAsZip } = await import('@/lib/projectDb')
    const blob = await exportFinProjectAsZip(folderHandle, currentProject)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentProject.name.replace(/[^a-z0-9]/gi, '_')}_FIN_viewer.zip`
    a.click()
    URL.revokeObjectURL(url)
  },

  addModelEntry: async (model: LoadedModel) => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return null

    const bytesCopy = new ArrayBuffer(model.fragBytes.byteLength)
    new Uint8Array(bytesCopy).set(new Uint8Array(model.fragBytes))

    const entry: import('@/types').ProjectModelEntry = {
      modelId: model.modelId,
      originalFileName: model.originalFileName,
      originalFileSizeBytes: model.originalFileSizeBytes,
      convertedFileSizeBytes: model.convertedFileSizeBytes,
      conversionTimeMs: model.conversionTimeMs,
      fragFile: `models/${model.modelId}.${model.type === 'glb' ? 'glb' : 'frag'}`,
      addedAt: Date.now(),
      type: model.type,
    }

    await saveModelToProject(folderHandle, { ...entry, fragBytes: bytesCopy })

    const updated: ProjectMeta = {
      ...currentProject,
      models: [...currentProject.models, entry],
      updatedAt: Date.now(),
    }
    await saveProjectMeta(folderHandle, updated)
    await cacheHandle(updated.projectId, folderHandle, updated, (updated as any).thumbnail)

    const recent = get().recentProjects.map(r =>
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    set({ currentProject: updated, isDirty: false, recentProjects: recent })

    return entry
  },

  removeModelEntry: async (modelId: string) => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return

    await deleteModelFromProject(folderHandle, modelId)

    const updated: ProjectMeta = {
      ...currentProject,
      models: currentProject.models.filter(m => m.modelId !== modelId),
      updatedAt: Date.now(),
    }
    await saveProjectMeta(folderHandle, updated)

    const recent = get().recentProjects.map(r =>
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    set({ currentProject: updated, isDirty: false, recentProjects: recent })
  },

  updateThumbnail: async (dataUrl: string) => {
    const { folderHandle, currentProject, recentProjects } = get()
    if (!folderHandle || !currentProject) return
    await saveThumbnailToProject(folderHandle, dataUrl)
    const updated = { ...currentProject, thumbnail: dataUrl }
    
    const updatedRecent = recentProjects.map(r => 
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    
    set({ currentProject: updated, recentProjects: updatedRecent })
  },

  saveViewAndSettings: async (camera, renderSettings) => {
    const { folderHandle, currentProject, recentProjects } = get()
    if (!folderHandle || !currentProject) return
    const updated = { ...currentProject, camera, renderSettings }
    await saveProjectMeta(folderHandle, updated)
    await cacheHandle(updated.projectId, folderHandle, updated, (updated as any).thumbnail)
    
    const updatedRecent = recentProjects.map(r => 
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    
    set({ currentProject: updated, recentProjects: updatedRecent })
  },

  updateModelTransform: async (modelId: string, transform: { position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number] }) => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return

    const updated: ProjectMeta = {
      ...currentProject,
      models: currentProject.models.map(m =>
        m.modelId === modelId ? { ...m, ...transform } : m
      ),
      updatedAt: Date.now(),
    }
    await saveProjectMeta(folderHandle, updated)

    const recent = get().recentProjects.map(r =>
      r.meta.projectId === updated.projectId ? { ...r, meta: updated } : r
    )
    set({ currentProject: updated, isDirty: false, recentProjects: recent })
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
}))
