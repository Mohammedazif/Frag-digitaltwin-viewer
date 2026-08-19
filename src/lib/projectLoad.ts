import { loadModelsFromProject } from '@/lib/projectDb'
import { unloadAllModels } from '@/lib/sceneTeardown'
import { useModelStore } from '@/store/useModelStore'
import { useLoadingProgressStore } from '@/store/useLoadingProgressStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { ProjectMeta } from '@/types'

/** Narrow a project to one location's models, keeping the project's own model order so
 *  the anchor model is the same every time this location is opened. */
export function metaForModelIds(meta: ProjectMeta, modelIds: string[] | undefined): ProjectMeta {
  if (!modelIds?.length) return { ...meta, models: [] }
  const wanted = new Set(modelIds)
  return { ...meta, models: meta.models.filter(m => wanted.has(m.modelId)) }
}

/** Helper: stream one model over HTTP with byte-level progress */
async function fetchModelOverHttp(
  fragFile: string,
  onBytes?: (bytesRead: number, totalBytes: number) => void
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(fragFile)
    if (!res.ok) return null
    if (!res.body) return res.arrayBuffer()
    const declaredLength = Number(res.headers.get('content-length'))
    const total = Number.isSafeInteger(declaredLength) && declaredLength > 0 ? declaredLength : 0
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let read = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      read += value.length
      onBytes?.(read, total)
    }
    const out = new Uint8Array(read)
    let offset = 0
    for (const c of chunks) { out.set(c, offset); offset += c.length }
    return out.buffer
  } catch {
    return null
  }
}

/** Read every model in `meta` off disk or over HTTP (when handle is null),
 *  adding each to the store the moment its bytes land */
export async function streamProjectModels(
  handle: FileSystemDirectoryHandle | null,
  meta: ProjectMeta
): Promise<void> {
  const { beginSession, updateEntry } = useLoadingProgressStore.getState()
  const addModel = useModelStore.getState().addModel

  const loadable = handle
    ? meta.models
    : meta.models.filter(m => m.fragFile)

  beginSession(loadable.map(m => ({
    modelId: m.modelId,
    name: m.originalFileName,
    sizeBytes: m.convertedFileSizeBytes || m.originalFileSizeBytes || 0,
  })), handle ? 'disk' : 'server')

  if (handle) {
    // Disk mode — original logic
    await loadModelsFromProject(handle, meta, (pm, readMs) => {
      updateEntry(pm.modelId, { phase: 'pending', readMs, bytesRead: pm.fragBytes.byteLength, sizeBytes: pm.fragBytes.byteLength })
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
    }, (modelId, bytesRead, totalBytes) => {
      updateEntry(modelId, { phase: 'reading', bytesRead, sizeBytes: totalBytes })
    }, (modelId) => {
      updateEntry(modelId, { phase: 'error', error: 'model file not found on disk' })
    })
  } else {
    // HTTP mode — standalone/exported viewer
    const MODEL_FETCH_CONCURRENCY = 2
    for (let i = 0; i < loadable.length; i += MODEL_FETCH_CONCURRENCY) {
      const batch = loadable.slice(i, i + MODEL_FETCH_CONCURRENCY)
      await Promise.all(batch.map(async (m) => {
        const readStart = performance.now()
        updateEntry(m.modelId, { phase: 'reading' })
        const buffer = await fetchModelOverHttp(m.fragFile!, (bytesRead, totalBytes) => {
          updateEntry(m.modelId, totalBytes ? { bytesRead, sizeBytes: totalBytes } : { bytesRead })
        })
        if (!buffer) {
          console.warn(`[projectLoad] Failed to fetch ${m.fragFile}`)
          updateEntry(m.modelId, { phase: 'error', error: 'fetch failed' })
          return
        }
        updateEntry(m.modelId, {
          phase: 'pending',
          readMs: performance.now() - readStart,
          bytesRead: buffer.byteLength,
          sizeBytes: buffer.byteLength,
        })
        addModel({
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
        })
      }))
    }
  }
}

/** Close whatever is open and load only this set. Ending the progress session first stops
 *  the previous session's delayed teardown from closing the new one. */
export async function loadModelSet(
  engine: FragmentsEngine | null,
  handle: FileSystemDirectoryHandle | null,
  meta: ProjectMeta,
  modelIds: string[] | undefined
): Promise<void> {
  useLoadingProgressStore.getState().endSession()
  await unloadAllModels(engine)
  useModelStore.getState().clearModels()
  useModelStore.getState().setActiveModelId(null)
  await streamProjectModels(handle, metaForModelIds(meta, modelIds))
}
