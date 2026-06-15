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

export async function cacheHandle(projectId: string, handle: FileSystemDirectoryHandle) {
  await set(projectId, handle, handleStore)
}

export async function getCachedHandles(): Promise<{ projectId: string; handle: FileSystemDirectoryHandle }[]> {
  const allKeys = await keys(handleStore)
  const results: { projectId: string; handle: FileSystemDirectoryHandle }[] = []
  for (const key of allKeys) {
    const handle = await get<FileSystemDirectoryHandle>(key, handleStore)
    if (handle) results.push({ projectId: String(key), handle })
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
  const fh = await dir.getFileHandle(filename, { create: true })
  const writable = await fh.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
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
  const fh = await dir.getFileHandle(filename, { create: true })
  const writable = await fh.createWritable()
  await writable.write(new Blob([data as unknown as BlobPart]))
  await writable.close()
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
export async function createProjectInFolder(name: string): Promise<FolderProject | null> {
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
    }

    await writeJson(handle, 'project.json', meta)
    await cacheHandle(projectId, handle)

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

    await cacheHandle(meta.projectId, handle)
    return { meta, handle }
  } catch (e: any) {
    if (e?.name === 'AbortError') return null
    throw e
  }
}

/** Load project from a cached handle */
export async function loadProjectFromHandle(handle: FileSystemDirectoryHandle): Promise<ProjectMeta | null> {
  return readJson<ProjectMeta>(handle, 'project.json')
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
  const fragFile = `${model.modelId}.frag`
  await writeBinary(modelsDir, fragFile, model.fragBytes)
  return `models/${fragFile}`
}

/** Load all model binaries listed in project.json */
export async function loadModelsFromProject(
  handle: FileSystemDirectoryHandle,
  meta: ProjectMeta
): Promise<ProjectModel[]> {
  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const results: ProjectModel[] = []

  for (const entry of meta.models) {
    const fragFile = `${entry.modelId}.frag`
    const bytes = await readBinary(modelsDir, fragFile)
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

  zip.file('project.json', JSON.stringify(meta, null, 2))

  // Thumbnail
  try {
    const thumbFh = await handle.getFileHandle('thumbnail.webp')
    const thumbFile = await thumbFh.getFile()
    zip.file('thumbnail.webp', await thumbFile.arrayBuffer())
  } catch { /* no thumbnail yet */ }

  // Models
  const modelsDir = await handle.getDirectoryHandle('models', { create: true })
  const modelsFolder = zip.folder('models')!
  for (const entry of meta.models) {
    const fragName = `${entry.modelId}.frag`
    const bytes = await readBinary(modelsDir, fragName)
    if (bytes) modelsFolder.file(fragName, bytes)
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
}
