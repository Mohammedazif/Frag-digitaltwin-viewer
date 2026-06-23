import { useEffect, useRef } from 'react'
import { useFinStore } from '@/store/useFinStore'

/**
 * Hook that polls FIN backend for live equipment and power data.
 * Automatically starts/stops based on connection state.
 * 
 * @param intervalMs - polling interval in milliseconds (default: 10000)
 */
export function useFinData(intervalMs: number = 10000) {
  const isConnected = useFinStore(s => s.isConnected)
  const equipment = useFinStore(s => s.equipment)
  const powerData = useFinStore(s => s.powerData)
  const lastUpdated = useFinStore(s => s.lastUpdated)
  const fetchEquipment = useFinStore(s => s.fetchEquipment)
  const fetchPower = useFinStore(s => s.fetchPower)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isConnected) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Fetch immediately
    fetchEquipment()
    fetchPower()

    // Then poll
    timerRef.current = setInterval(() => {
      fetchEquipment()
      fetchPower()
    }, intervalMs)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isConnected, intervalMs, fetchEquipment, fetchPower])

  return {
    equipment,
    powerData,
    lastUpdated,
    isConnected,
  }
}
