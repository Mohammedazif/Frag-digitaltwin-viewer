import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function RenderPanel() {
  const realisticMode = useAppStore(s => s.realisticMode)
  const exposure = useAppStore(s => s.exposure)
  const lightIntensity = useAppStore(s => s.lightIntensity)
  const ambientIntensity = useAppStore(s => s.ambientIntensity)
  const timeOfDay = useAppStore(s => s.timeOfDay)
  const bloomStrength = useAppStore(s => s.bloomStrength)
  const bloomThreshold = useAppStore(s => s.bloomThreshold)
  const fogDensity = useAppStore(s => s.fogDensity)
  const setRealisticMode = useAppStore(s => s.setRealisticMode)
  const setLightingParams = useAppStore(s => s.setLightingParams)

  const [open, setOpen] = useState(false)

  const formatTime = (time: number) => {
    const hours = Math.floor(time)
    const minutes = Math.floor((time - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  return (
    <div className={`position-panel ${open ? 'open' : ''}`}>
      {/* Toggle tab */}
      <button
        className="position-panel-tab"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Close Render Panel' : 'Open Render Panel'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        <span>Render</span>
      </button>

      {/* Panel body */}
      <div className="position-panel-body">
        <div className="position-panel-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span>Rendering Engine</span>
        </div>

        <div className="position-field-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <input 
              type="checkbox" 
              checked={realisticMode}
              onChange={e => setRealisticMode(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', cursor: 'pointer' }}
            />
            Advanced Rendering
          </label>
          
          {realisticMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '12px', paddingLeft: '22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Time of Day</span>
                  <span>{formatTime(timeOfDay)}</span>
                </div>
                <input 
                  type="range" min="0" max="24" step="0.1" 
                  value={timeOfDay} 
                  onChange={e => setLightingParams({ timeOfDay: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Exposure</span>
                  <span>{exposure.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0.1" max="3" step="0.05" 
                  value={exposure} 
                  onChange={e => setLightingParams({ exposure: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Sun Intensity</span>
                  <span>{lightIntensity.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="5" step="0.1" 
                  value={lightIntensity} 
                  onChange={e => setLightingParams({ lightIntensity: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Ambient Light</span>
                  <span>{ambientIntensity.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="3" step="0.1" 
                  value={ambientIntensity} 
                  onChange={e => setLightingParams({ ambientIntensity: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Bloom Strength</span>
                  <span>{bloomStrength.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.01" 
                  value={bloomStrength} 
                  onChange={e => setLightingParams({ bloomStrength: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Bloom Threshold</span>
                  <span>{bloomThreshold.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="3" step="0.01" 
                  value={bloomThreshold} 
                  onChange={e => setLightingParams({ bloomThreshold: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Fog Density</span>
                  <span>{fogDensity.toFixed(5)}</span>
                </div>
                <input 
                  type="range" min="0" max="0.005" step="0.00001" 
                  value={fogDensity} 
                  onChange={e => setLightingParams({ fogDensity: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
