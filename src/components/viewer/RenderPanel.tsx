import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

// ─── Sky Presets ────────────────────────────────────────────────────────────
const DEFAULT_PRESET = {
  label: '⚙️ Default',
  params: {
    timeOfDay: 14.5, cloudDensity: 0.5, exposure: 0.85, fogDensity: 0.00015,
    visualTemperature: 6500, bloomStrength: 0.15, bloomThreshold: 1.5,
    lightIntensity: 1.2, ambientIntensity: 0.3, visualSaturation: 1.0,
    visualContrast: 1.0, visualVignette: 0.4, cloudSpeed: 1.0,
  },
}

const SKY_PRESETS = [
  DEFAULT_PRESET,
  {
    label: '☀️ Clear',
    params: {
      timeOfDay: 12.5, cloudDensity: 0.12, exposure: 1.05, fogDensity: 0.00006,
      visualTemperature: 7200, bloomStrength: 0.12, bloomThreshold: 1.2,
      lightIntensity: 2.0, ambientIntensity: 0.35, visualSaturation: 1.1,
      visualContrast: 1.05, visualVignette: 0.3,
    },
  },
  {
    label: '🌅 Golden',
    params: {
      timeOfDay: 17.2, cloudDensity: 0.45, exposure: 1.4, fogDensity: 0.00022,
      visualTemperature: 4000, bloomStrength: 0.45, bloomThreshold: 0.85,
      lightIntensity: 1.1, ambientIntensity: 0.18, visualSaturation: 1.3,
      visualContrast: 1.1, visualVignette: 0.45,
    },
  },
  {
    label: '⛅ Overcast',
    params: {
      timeOfDay: 12.0, cloudDensity: 0.92, exposure: 0.65, fogDensity: 0.00028,
      visualTemperature: 8000, bloomStrength: 0.03, bloomThreshold: 2.0,
      lightIntensity: 0.25, ambientIntensity: 0.85, visualSaturation: 0.9,
      visualContrast: 0.95, visualVignette: 0.2,
    },
  },
  {
    label: '🌆 Blue Hour',
    params: {
      timeOfDay: 19.9, cloudDensity: 0.22, exposure: 0.52, fogDensity: 0.00010,
      visualTemperature: 9500, bloomStrength: 0.18, bloomThreshold: 1.0,
      lightIntensity: 0.3, ambientIntensity: 0.15, visualSaturation: 1.45,
      visualContrast: 1.15, visualVignette: 0.5,
    },
  },
  {
    label: '🌫️ Hazy',
    params: {
      timeOfDay: 14.5, cloudDensity: 0.58, exposure: 1.15, fogDensity: 0.00075,
      visualTemperature: 5600, bloomStrength: 0.22, bloomThreshold: 1.3,
      lightIntensity: 0.9, ambientIntensity: 0.55, visualSaturation: 0.85,
      visualContrast: 0.9, visualVignette: 0.35,
    },
  },
] as const

// ─── Helper Components ───────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  format?: (v: number) => string; onChange: (v: number) => void
}) {
  const display = format ? format(value) : value.toFixed(2)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  )
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
      <input
        type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 2px' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
    </div>
  )
}

// ─── RenderPanel ─────────────────────────────────────────────────────────────
export function RenderPanel() {
  const realisticMode       = useAppStore(s => s.realisticMode)
  const exposure            = useAppStore(s => s.exposure)
  const lightIntensity      = useAppStore(s => s.lightIntensity)
  const ambientIntensity    = useAppStore(s => s.ambientIntensity)
  const timeOfDay           = useAppStore(s => s.timeOfDay)
  const bloomStrength       = useAppStore(s => s.bloomStrength)
  const bloomThreshold      = useAppStore(s => s.bloomThreshold)
  const fogDensity          = useAppStore(s => s.fogDensity)
  const cloudDensity        = useAppStore(s => s.cloudDensity)
  const cloudShadowsEnabled = useAppStore(s => s.cloudShadowsEnabled)
  const cloudSpeed          = useAppStore(s => s.cloudSpeed)
  const dofEnabled          = useAppStore(s => s.dofEnabled)
  const dofFocus            = useAppStore(s => s.dofFocus)
  const dofAperture         = useAppStore(s => s.dofAperture)
  const visualSaturation    = useAppStore(s => s.visualSaturation)
  const visualTemperature   = useAppStore(s => s.visualTemperature)
  const visualContrast      = useAppStore(s => s.visualContrast)
  const visualVignette      = useAppStore(s => s.visualVignette)
  const godRaysEnabled      = useAppStore(s => s.godRaysEnabled)
  const godRayStrength      = useAppStore(s => s.godRayStrength)
  const chromaticAberration = useAppStore(s => s.chromaticAberration)
  const autoFocus           = useAppStore(s => s.autoFocus)
  const bloomEnabled        = useAppStore(s => s.bloomEnabled)

  const setRealisticMode  = useAppStore(s => s.setRealisticMode)
  const setLightingParams = useAppStore(s => s.setLightingParams)

  const [open, setOpen] = useState(false)
  // Tracks which preset button is currently active (null = no preset / custom)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const formatTime = (time: number) => {
    const hours   = Math.floor(time)
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
      <div className="position-panel-body" style={{ maxHeight: '290px', overflowY: 'auto' }}>
        <div className="position-panel-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span>Rendering Engine</span>
        </div>

        <div className="position-field-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Toggle label="Advanced Rendering" checked={realisticMode} onChange={setRealisticMode} />

          {realisticMode && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              width: '100%', marginTop: '12px', paddingLeft: '22px',
              paddingRight: '6px',
              maxHeight: '220px', overflowY: 'auto',
              scrollbarWidth: 'thin',
            }}>

              {/* ── Sky Presets ─────────────────────────────────────── */}
              <SectionDivider label="Sky Presets" />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {SKY_PRESETS.map(preset => {
                  const isActive = activePreset === preset.label
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setLightingParams(preset.params)
                        setActivePreset(preset.label)
                      }}
                      title={preset.label}
                      style={{
                        fontSize: '9px', padding: '4px 7px', borderRadius: '5px',
                        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                        background: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                        color: isActive ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer', fontWeight: isActive ? 700 : 600,
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        boxShadow: isActive ? '0 0 0 2px rgba(var(--accent-rgb, 22,101,52), 0.18)' : 'none',
                      }}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              {/* ── Lighting ─────────────────────────────────────────── */}
              <SectionDivider label="Lighting" />
              <Slider label="Time of Day" value={timeOfDay} min={0} max={24} step={0.1}
                format={formatTime} onChange={v => setLightingParams({ timeOfDay: v })} />
              <Slider label="Exposure" value={exposure} min={0.1} max={3} step={0.05}
                onChange={v => setLightingParams({ exposure: v })} />
              <Slider label="Sun Intensity" value={lightIntensity} min={0} max={5} step={0.1}
                onChange={v => setLightingParams({ lightIntensity: v })} />
              <Slider label="Ambient Light" value={ambientIntensity} min={0} max={3} step={0.1}
                onChange={v => setLightingParams({ ambientIntensity: v })} />

              {/* ── Clouds ───────────────────────────────────────────── */}
              <SectionDivider label="Clouds" />
              <Slider label="Cloud Density" value={cloudDensity} min={0} max={1} step={0.01}
                onChange={v => setLightingParams({ cloudDensity: v })} />
              <Slider label="Cloud Speed" value={cloudSpeed} min={0} max={5} step={0.1}
                onChange={v => setLightingParams({ cloudSpeed: v })} />
              <Toggle label="Cloud Shadows"
                checked={cloudShadowsEnabled}
                onChange={v => setLightingParams({ cloudShadowsEnabled: v })} />

              {/* ── Bloom ────────────────────────────────────────────── */}
              <SectionDivider label="Bloom" />
              <Toggle label="Enable Bloom"
                checked={bloomEnabled}
                onChange={v => setLightingParams({ bloomEnabled: v })} />
              {bloomEnabled && (
                <>
                  <Slider label="Bloom Strength" value={bloomStrength} min={0} max={2} step={0.01}
                    onChange={v => setLightingParams({ bloomStrength: v })} />
                  <Slider label="Bloom Threshold" value={bloomThreshold} min={0} max={3} step={0.01}
                    onChange={v => setLightingParams({ bloomThreshold: v })} />
                </>
              )}

              {/* ── God Rays ─────────────────────────────────────────── */}
              <SectionDivider label="God Rays" />
              <Toggle label="Volumetric God Rays"
                checked={godRaysEnabled}
                onChange={v => setLightingParams({ godRaysEnabled: v })} />
              {godRaysEnabled && (
                <Slider label="Ray Strength" value={godRayStrength} min={0} max={1.5} step={0.05}
                  onChange={v => setLightingParams({ godRayStrength: v })} />
              )}

              {/* ── Atmosphere ───────────────────────────────────────── */}
              <SectionDivider label="Atmosphere" />
              <Slider label="Fog Density" value={fogDensity} min={0} max={0.005} step={0.00001}
                format={v => v.toFixed(5)} onChange={v => setLightingParams({ fogDensity: v })} />

              {/* ── Camera ───────────────────────────────────────────── */}
              <SectionDivider label="Camera" />
              <Toggle label="Depth of Field (Blur)"
                checked={dofEnabled}
                onChange={v => setLightingParams({ dofEnabled: v })} />
              {dofEnabled && (
                <>
                  <Toggle label="Auto-Focus (orbit target)"
                    checked={autoFocus}
                    onChange={v => setLightingParams({ autoFocus: v })} />
                  {!autoFocus && (
                    <Slider label="Focus Distance" value={dofFocus} min={100} max={20000} step={100}
                      format={v => v.toFixed(0)} onChange={v => setLightingParams({ dofFocus: v })} />
                  )}
                  <Slider label="Aperture" value={dofAperture} min={0.00001} max={0.0005} step={0.00001}
                    format={v => v.toFixed(5)} onChange={v => setLightingParams({ dofAperture: v })} />
                </>
              )}

              {/* ── Color Grading ────────────────────────────────────── */}
              <SectionDivider label="Color Grading" />
              <Slider label="Saturation" value={visualSaturation} min={0} max={2} step={0.05}
                onChange={v => setLightingParams({ visualSaturation: v })} />
              <Slider label="Temperature (K)" value={visualTemperature} min={4000} max={10000} step={100}
                format={v => v.toFixed(0)} onChange={v => setLightingParams({ visualTemperature: v })} />
              <Slider label="Contrast" value={visualContrast} min={0.5} max={2} step={0.05}
                onChange={v => setLightingParams({ visualContrast: v })} />
              <Slider label="Vignette" value={visualVignette} min={0} max={1} step={0.05}
                onChange={v => setLightingParams({ visualVignette: v })} />
              <Slider label="Chromatic Aberration" value={chromaticAberration} min={0} max={1} step={0.05}
                onChange={v => setLightingParams({ chromaticAberration: v })} />

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
