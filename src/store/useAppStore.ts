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
  fogDensity: number

  setStep: (step: AppStep) => void
  setProgress: (progress: number, label?: string) => void
  setError: (error: string) => void
  setRealisticMode: (enabled: boolean) => void
  setLightingParams: (params: Partial<{ exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, fogDensity: number }>) => void
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
  fogDensity: 0.00015,

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
