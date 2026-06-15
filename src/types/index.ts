export type AppStep =
  | 'projects'
  | 'idle'
  | 'uploading'
  | 'converting'
  | 'viewing'
  | 'error'

export interface LoadedModel {
  modelId: string
  originalFileName: string
  originalFileSizeBytes: number
  convertedFileSizeBytes: number
  conversionTimeMs: number
  fragBytes: ArrayBuffer
}

export interface ConversionProgress {
  progress: number
  label: string
}

// ── Project System ─────────────────────────────────────────────────────────

export interface ProjectModelEntry {
  modelId: string
  originalFileName: string
  originalFileSizeBytes: number
  convertedFileSizeBytes: number
  conversionTimeMs: number
  fragFile: string   // relative path inside project folder e.g. "models/model-abc.frag"
  addedAt: number
}

export interface ProjectMeta {
  version: number
  projectId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  models: ProjectModelEntry[]
  geolocation: {
    latitude: number
    longitude: number
    altitude: number
    rotation: number
  } | null
}

// ProjectModel is the in-memory representation with the actual bytes loaded
export interface ProjectModel extends ProjectModelEntry {
  fragBytes: ArrayBuffer
}
