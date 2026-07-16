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
  type?: 'frag' | 'glb'
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

export interface ConversionProgress {
  progress: number
  label: string
}

export interface ProjectModelEntry {
  modelId: string
  originalFileName: string
  originalFileSizeBytes: number
  convertedFileSizeBytes: number
  conversionTimeMs: number
  fragFile: string
  addedAt: number
  type?: 'frag' | 'glb'
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

export interface MaterialOverride {
  id: string
  modelId: string
  targetId: number | string // Fragment Item ID or category name
  targetType: 'item' | 'category'
  color?: string
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
  textureDataUrl?: string
  textureScale?: number
}


export interface ProjectCamera {
  position: [number, number, number]
  target: [number, number, number]
}

export interface ProjectRenderSettings {
  realisticMode: boolean
  exposure: number
  lightIntensity: number
  ambientIntensity: number
  timeOfDay: number
  bloomStrength: number
  bloomThreshold: number
  fogDensity: number
  cloudDensity: number
  cloudSpeed: number
  dofEnabled: boolean
  dofFocus: number
  dofAperture: number
  dofMaxBlur: number
  visualSaturation: number
  visualTemperature: number
  visualContrast: number
  visualVignette: number
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
  camera?: ProjectCamera
  renderSettings?: ProjectRenderSettings
  isFinProject?: boolean
  apiSettings?: ProjectApiSettings
  materialOverrides?: Record<string, MaterialOverride>
}

export interface ProjectApiSettings {
  finBaseUrl?: string
  finProjectName?: string
  finInterval?: number
  finDirectMode?: boolean
  finLivePoints?: Record<string, string>
  finEndpoints?: Record<string, string>
  weatherApiKey?: string
  weatherLat?: number
  weatherLon?: number

  // Dashboard Configuration
  navButtons?: Array<{ id: string, icon: string, tooltip: string, action: string, panel?: string, event?: string }>
  leftCards?: Array<{ id: string, label: string, icon: string, accent: string, source: string, format?: string, field?: string }>
  rightCards?: Array<{ id: string, label: string, icon: string, accent: string, source: string, format?: string, field?: string }>
  sideButtons?: Array<{ id: string, icon: string, label: string, action: string, dashboard: string, enabled?: boolean }>
  subPanels?: Record<string, { label: string, type: string }>
  modelsConfig?: Array<{ id: string, label: string, name: string, active: boolean }>
  floorsConfig?: Array<{ id: string, label: string, name: string }>
}

export interface ProjectModel extends ProjectModelEntry {
  fragBytes: ArrayBuffer
}
