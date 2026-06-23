import { create } from 'zustand'
import type { LoadedModel } from '@/types'

interface ModelState {
  models: LoadedModel[]
  modelVisibility: Record<string, boolean>
  activeModelId: string | null
  addModel: (model: LoadedModel) => void
  removeModel: (modelId: string) => void
  clearModels: () => void
  toggleVisibility: (modelId: string) => void
  setActiveModelId: (modelId: string | null) => void
  updateModelTransform: (modelId: string, transform: { position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number] }) => void
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  modelVisibility: {},
  activeModelId: null,
  addModel: (model) => set((state) => ({ 
    models: [...state.models, model],
    modelVisibility: { ...state.modelVisibility, [model.modelId]: true }
  })),
  removeModel: (modelId) => set((state) => {
    const { [modelId]: _, ...restVisibility } = state.modelVisibility
    return {
      models: state.models.filter(m => m.modelId !== modelId),
      modelVisibility: restVisibility,
      activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
    }
  }),
  clearModels: () => set({ models: [], modelVisibility: {}, activeModelId: null }),
  toggleVisibility: (modelId) => set((state) => ({
    modelVisibility: { ...state.modelVisibility, [modelId]: !state.modelVisibility[modelId] }
  })),
  setActiveModelId: (modelId) => set({ activeModelId: modelId }),
  updateModelTransform: (modelId, transform) => set((state) => ({
    models: state.models.map(m => m.modelId === modelId ? { ...m, ...transform } : m),
  })),
}))
