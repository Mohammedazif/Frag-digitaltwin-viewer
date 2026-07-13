import { create } from 'zustand'
import type { AppStep } from '@/types'

interface AppState {
  step: AppStep
  conversionProgress: number
  conversionStepLabel: string
  error: string | null
  realisticMode: boolean
  exposure: number
  lightIntensity: number
  ambientIntensity: number
  timeOfDay: number
  bloomStrength: number
  bloomThreshold: number
  bloomEnabled: boolean
  fogDensity: number
  cloudDensity: number
  cloudShadowsEnabled: boolean
  cloudSpeed: number
  dofEnabled: boolean
  dofFocus: number
  dofAperture: number
  dofMaxBlur: number
  visualSaturation: number
  visualTemperature: number
  visualContrast: number
  visualVignette: number
  godRaysEnabled: boolean
  godRayStrength: number
  chromaticAberration: number
  autoFocus: boolean

  setStep: (step: AppStep) => void
  setProgress: (progress: number, label?: string) => void
  setError: (error: string) => void
  setRealisticMode: (enabled: boolean) => void
  setLightingParams: (params: Partial<{ exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, bloomEnabled: boolean, fogDensity: number, cloudDensity: number, cloudShadowsEnabled: boolean, cloudSpeed: number, dofEnabled: boolean, dofFocus: number, dofAperture: number, dofMaxBlur: number, visualSaturation: number, visualTemperature: number, visualContrast: number, visualVignette: number, godRaysEnabled: boolean, godRayStrength: number, chromaticAberration: number, autoFocus: boolean }>) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  step: 'projects',
  conversionProgress: 0,
  conversionStepLabel: '',
  error: null,
  realisticMode: false,
  exposure: 0.85,
  lightIntensity: 1.2,
  ambientIntensity: 0.3,
  timeOfDay: 14.5,
  bloomStrength: 0.15,
  bloomThreshold: 1.5,
  bloomEnabled: true,
  fogDensity: 0.00015,
  cloudDensity: 0.5,
  cloudShadowsEnabled: true,
  cloudSpeed: 1.0,
  dofEnabled: false,
  dofFocus: 2000.0,
  dofAperture: 0.0001,
  dofMaxBlur: 0.01,
  visualSaturation: 1.0,
  visualTemperature: 6500.0,
  visualContrast: 1.0,
  visualVignette: 0.4,
  godRaysEnabled: false,
  godRayStrength: 0.8,
  chromaticAberration: 0.0,
  autoFocus: false,

  setStep: (step) => set({ step, error: null }),
  setProgress: (progress, label = '') => set({ conversionProgress: progress, conversionStepLabel: label }),
  setError: (error) => set({ step: 'error', error }),
  setRealisticMode: (realisticMode) => set({ realisticMode }),
  setLightingParams: (params) => set((state) => ({ ...state, ...params })),
  reset: () =>
    set({
      step: 'idle',
      conversionProgress: 0,
      conversionStepLabel: '',
      error: null,
      realisticMode: false,
    }),
}))
