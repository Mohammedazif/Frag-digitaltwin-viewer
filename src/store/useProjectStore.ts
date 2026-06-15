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
  createProject: (name: string) => Promise<ProjectMeta | null>
  openProject: () => Promise<ProjectMeta | null>
  openRecentProject: (handle: FileSystemDirectoryHandle) => Promise<ProjectMeta | null>
  closeProject: () => void
  saveProject: () => Promise<void>
  deleteRecentProject: (projectId: string) => Promise<void>
  exportAsZip: () => Promise<void>

  // Model management within project
  addModelEntry: (model: LoadedModel) => Promise<ProjectModelEntry | null>
  removeModelEntry: (modelId: string) => Promise<void>
  updateThumbnail: (dataUrl: string) => Promise<void>
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
    for (const { handle } of cached) {
      try {
        const meta = await loadProjectFromHandle(handle)
        if (meta) valid.push({ meta, handle })
      } catch {
        // handle no longer valid, skip
      }
    }
    valid.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt)
    set({ recentProjects: valid, isLoading: false })
  },

  createProject: async (name: string) => {
    const result = await createProjectInFolder(name)
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

    await cacheHandle(meta.projectId, handle)

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

    // Refresh the recent list
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

  addModelEntry: async (model: LoadedModel) => {
    const { currentProject, folderHandle } = get()
    if (!currentProject || !folderHandle) return null

    // CRITICAL: Clone the bytes synchronously BEFORE any await.
    // The 3D engine's load() call detaches/neuters the original ArrayBuffer,
    // and React effects can fire between our awaits, causing a 0-byte write.
    const bytesCopy = new ArrayBuffer(model.fragBytes.byteLength)
    new Uint8Array(bytesCopy).set(new Uint8Array(model.fragBytes))

    const entry: import('@/types').ProjectModelEntry = {
      modelId: model.modelId,
      originalFileName: model.originalFileName,
      originalFileSizeBytes: model.originalFileSizeBytes,
      convertedFileSizeBytes: model.convertedFileSizeBytes,
      conversionTimeMs: model.conversionTimeMs,
      fragFile: `models/${model.modelId}.frag`,
      addedAt: Date.now(),
    }

    // Write .frag to disk using our safe copy
    await saveModelToProject(folderHandle, { ...entry, fragBytes: bytesCopy })

    // Update project.json
    const updated: ProjectMeta = {
      ...currentProject,
      models: [...currentProject.models, entry],
      updatedAt: Date.now(),
    }
    await saveProjectMeta(folderHandle, updated)

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
    const { folderHandle, currentProject } = get()
    if (!folderHandle || !currentProject) return
    await saveThumbnailToProject(folderHandle, dataUrl)
    // Store a lightweight data-url in meta for the project list card
    const updated = { ...currentProject, thumbnail: dataUrl }
    set({ currentProject: updated })
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
}))
