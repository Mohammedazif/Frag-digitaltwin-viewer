import { create } from 'zustand'
import type {
  FinEquipment,
  FinPowerLiveResponse,
  FinStatusResponse,
  FinLoginRequest,
} from '@/types/fin'

interface FinState {
  // Connection
  isConnected: boolean
  isAuthenticating: boolean
  connectionError: string | null
  status: FinStatusResponse | null

  // Data
  equipment: FinEquipment[]
  powerData: FinPowerLiveResponse | null
  lastUpdated: string | null

  // Actions
  login: (req: FinLoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  fetchStatus: () => Promise<void>
  fetchEquipment: () => Promise<void>
  fetchPower: () => Promise<void>
  setConnectionError: (error: string | null) => void
}

const FIN_API_BASE = '/api/fin'

export const useFinStore = create<FinState>((set, get) => ({
  isConnected: false,
  isAuthenticating: false,
  connectionError: null,
  status: null,
  equipment: [],
  powerData: null,
  lastUpdated: null,

  login: async (req: FinLoginRequest): Promise<boolean> => {
    set({ isAuthenticating: true, connectionError: null })
    try {
      const res = await fetch(`${FIN_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }))
        set({ isAuthenticating: false, connectionError: err.detail || 'Login failed' })
        return false
      }
      set({ isConnected: true, isAuthenticating: false, connectionError: null })

      // Kick off initial data fetch
      setTimeout(() => {
        get().fetchEquipment()
        get().fetchPower()
      }, 2000)

      return true
    } catch (e) {
      set({
        isAuthenticating: false,
        connectionError: e instanceof Error ? e.message : 'Network error',
      })
      return false
    }
  },

  logout: async () => {
    try {
      await fetch(`${FIN_API_BASE}/logout`, { method: 'POST' })
    } catch {
      // ignore
    }
    set({
      isConnected: false,
      equipment: [],
      powerData: null,
      lastUpdated: null,
      status: null,
    })
  },

  fetchStatus: async () => {
    try {
      const res = await fetch(`${FIN_API_BASE}/status`)
      if (res.ok) {
        const data: FinStatusResponse = await res.json()
        set({ status: data, isConnected: data.connected })
      }
    } catch {
      // Backend not running
      set({ isConnected: false })
    }
  },

  fetchEquipment: async () => {
    try {
      const res = await fetch(`${FIN_API_BASE}/equip-live`)
      if (res.ok) {
        const data = await res.json()
        set({
          equipment: data.equipment || [],
          lastUpdated: data.timestamp || new Date().toISOString(),
        })
      } else if (res.status === 401) {
        set({ isConnected: false })
      }
    } catch {
      // silent
    }
  },

  fetchPower: async () => {
    try {
      const res = await fetch(`${FIN_API_BASE}/power-live`)
      if (res.ok) {
        const data: FinPowerLiveResponse = await res.json()
        set({ powerData: data })
      } else if (res.status === 401) {
        set({ isConnected: false })
      }
    } catch {
      // silent
    }
  },

  setConnectionError: (error) => set({ connectionError: error }),
}))
