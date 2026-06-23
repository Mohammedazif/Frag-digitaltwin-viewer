// TypeScript interfaces for FIN Framework data
// These match the JSON payloads from the FastAPI backend

export interface FinEquipmentPoint {
  navName: string
  currentValue: string
  status: string
}

export interface FinAlarm {
  alarm: string
  priority: number
}

export interface FinEquipment {
  name: string
  floor: string
  category: 'hvac' | 'cctv'
  inAlarm: boolean
  alarms: FinAlarm[]
  bimId: string
  points: FinEquipmentPoint[]
}

export interface FinEquipLiveResponse {
  timestamp: string | null
  equipment: FinEquipment[]
}

export interface FinFddRule {
  equip: string
  floor: string
  alarms: number
  rules: Record<string, string>
}

export interface FinPowerLiveResponse {
  timestamp: string
  total_power: number
  carbon_emission: number
  water_consumption: number
  previous_month: number
  current_month: number
  target_monthly: number | null
  avg_temp: number
  avg_hum: number
  avg_co2: number
  ahu: number
  fcu: number
  boiler: number
  chiller: number
  cooling_tower: number
  vav: number
  lighting: number
  power_sockets: number
  pumps: number
  unit: string
  power_history: Record<string, unknown>
  fdd: FinFddRule[]
}

export interface FinStatusResponse {
  connected: boolean
  project_name: string
  server_url: string
  display_name: string
}

export interface FinLoginRequest {
  username: string
  password: string
  server_url?: string
  project_name?: string
}
