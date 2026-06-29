import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useModelStore } from '@/store/useModelStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import { applyModelTransform } from '@/lib/transformUtils'

interface ModelPositionPanelProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
  pickedCoord: [number, number, number] | null
  onClearPickedCoord: () => void
}

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

export function ModelPositionPanel({ engineRef, pickedCoord, onClearPickedCoord }: ModelPositionPanelProps) {
  const models = useModelStore(s => s.models)
  const activeModelId = useModelStore(s => s.activeModelId)
  const setActiveModelId = useModelStore(s => s.setActiveModelId)
  const updateModelTransform = useModelStore(s => s.updateModelTransform)
  const updateProjectTransform = useProjectStore(s => s.updateModelTransform)

  // Position
  const [px, setPX] = useState('0')
  const [py, setPY] = useState('0')
  const [pz, setPZ] = useState('0')
  
  // Rotation
  const [rx, setRX] = useState('0')
  const [ry, setRY] = useState('0')
  const [rz, setRZ] = useState('0')
  
  // Scale
  const [sx, setSX] = useState('1')
  const [sy, setSY] = useState('1')
  const [sz, setSZ] = useState('1')

  const [open, setOpen] = useState(false)
  const applyingRef = useRef(false)

  const activeModel = models.find(m => m.modelId === activeModelId) ?? null

  useEffect(() => {
    if (activeModel) {
      if (activeModel.position) {
        setPX(activeModel.position[0].toString())
        setPY(activeModel.position[1].toString())
        setPZ(activeModel.position[2].toString())
      } else {
        setPX('0'); setPY('0'); setPZ('0')
      }
      
      if (activeModel.rotation) {
        setRX((activeModel.rotation[0] * RAD2DEG).toFixed(3))
        setRY((activeModel.rotation[1] * RAD2DEG).toFixed(3))
        setRZ((activeModel.rotation[2] * RAD2DEG).toFixed(3))
      } else {
        setRX('0'); setRY('0'); setRZ('0')
      }

      if (activeModel.scale) {
        setSX(activeModel.scale[0].toString())
        setSY(activeModel.scale[1].toString())
        setSZ(activeModel.scale[2].toString())
      } else {
        setSX('1'); setSY('1'); setSZ('1')
      }
    } else {
      setPX('0'); setPY('0'); setPZ('0')
      setRX('0'); setRY('0'); setRZ('0')
      setSX('1'); setSY('1'); setSZ('1')
    }
  }, [activeModelId])

  useEffect(() => {
    if (pickedCoord) setOpen(true)
  }, [pickedCoord])

  const applyTransform = async () => {
    if (!activeModelId || applyingRef.current) return
    applyingRef.current = true
    
    const pos: [number, number, number] = [parseFloat(px) || 0, parseFloat(py) || 0, parseFloat(pz) || 0]
    const rot: [number, number, number] = [(parseFloat(rx) || 0) * DEG2RAD, (parseFloat(ry) || 0) * DEG2RAD, (parseFloat(rz) || 0) * DEG2RAD]
    const scl: [number, number, number] = [parseFloat(sx) || 1, parseFloat(sy) || 1, parseFloat(sz) || 1]

    const engine = engineRef.current
    if (engine) {
      const glbObj = engine.world.scene.three.children.find(
        (c: THREE.Object3D) => c.userData?.modelId === activeModelId
      )
      if (glbObj) {
        applyModelTransform(glbObj, { position: pos, rotation: rot, scale: scl })
      } else {
        try {
          const fragModel = engine.fragments.models.list.get(activeModelId)
          if (fragModel?.object) {
            applyModelTransform(fragModel.object, { position: pos, rotation: rot, scale: scl })
            await engine.fragments.update(true)
          }
        } catch { /* ignore */ }
      }
    }

    const transformObj = { position: pos, rotation: rot, scale: scl }
    updateModelTransform(activeModelId, transformObj)
    await updateProjectTransform(activeModelId, transformObj)
    applyingRef.current = false
  }

  const handleApply = () => {
    setPX((parseFloat(px) || 0).toString())
    setPY((parseFloat(py) || 0).toString())
    setPZ((parseFloat(pz) || 0).toString())
    
    setRX((parseFloat(rx) || 0).toString())
    setRY((parseFloat(ry) || 0).toString())
    setRZ((parseFloat(rz) || 0).toString())
    
    setSX((parseFloat(sx) || 1).toString())
    setSY((parseFloat(sy) || 1).toString())
    setSZ((parseFloat(sz) || 1).toString())
    
    applyTransform()
  }

  const handleUsePickedCoord = () => {
    if (!pickedCoord) return
    setPX(pickedCoord[0].toString())
    setPY(pickedCoord[1].toString())
    setPZ(pickedCoord[2].toString())
  }

  const handleApplyPickedCoord = () => {
    if (!pickedCoord) return
    setPX(pickedCoord[0].toString())
    setPY(pickedCoord[1].toString())
    setPZ(pickedCoord[2].toString())
    
    if (activeModelId && !applyingRef.current) {
       setTimeout(applyTransform, 50)
    }
    onClearPickedCoord()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply()
  }

  return (
    <div className={`position-panel ${open ? 'open' : ''}`}>
      {/* Toggle tab */}
      <button
        className="position-panel-tab"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Close Transform Panel' : 'Open Transform Panel'}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
        </svg>
        <span>Transform</span>
      </button>

      {/* Panel body */}
      <div className="position-panel-body" style={{ maxHeight: '280px' }}>
        <div className="position-panel-header">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: 'var(--accent)' }}>
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          <span>Model Transform</span>
        </div>

        {/* Model selector */}
        <div className="position-field-group">
          <label className="position-label">Select Model</label>
          <select
            className="position-select"
            value={activeModelId ?? ''}
            onChange={e => setActiveModelId(e.target.value || null)}
          >
            <option value="">— choose a model —</option>
            {models.map(m => (
              <option key={m.modelId} value={m.modelId}>
                {m.originalFileName}
              </option>
            ))}
          </select>
        </div>

        {/* Picked coordinate display */}
        {pickedCoord && (
          <div className="position-picked-card">
            <div className="position-picked-title">
              <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11">
                <circle cx="10" cy="10" r="3" fill="currentColor"/>
                <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Picked Point
            </div>
            <div className="position-picked-coords">
              <span>X <b>{pickedCoord[0]}</b></span>
              <span>Y <b>{pickedCoord[1]}</b></span>
              <span>Z <b>{pickedCoord[2]}</b></span>
            </div>
            <div className="position-picked-actions">
              <button className="position-btn-sm" onClick={handleUsePickedCoord}>Fill inputs</button>
              {activeModelId && (
                <button className="position-btn-sm accent" onClick={handleApplyPickedCoord}>Apply Position</button>
              )}
              <button className="position-btn-sm muted" onClick={onClearPickedCoord}>Clear</button>
            </div>
          </div>
        )}

        {/* Transform Inputs */}
        <div className="position-field-group">
          <label className="position-label">Position (World Units)</label>
          <div className="position-xyz-row">
            {([['X', px, setPX], ['Y', py, setPY], ['Z', pz, setPZ]] as const).map(([axis, val, setter]) => (
              <div key={axis} className="position-xyz-field">
                <span className="position-axis-label">{axis}</span>
                <input className="position-input" type="number" step="0.1" value={val} onChange={e => setter(e.target.value)} onKeyDown={handleKeyDown} disabled={!activeModelId} />
              </div>
            ))}
          </div>
        </div>

        <div className="position-field-group" style={{ marginTop: '4px' }}>
          <label className="position-label">Rotation (Degrees)</label>
          <div className="position-xyz-row">
            {([['X', rx, setRX], ['Y', ry, setRY], ['Z', rz, setRZ]] as const).map(([axis, val, setter]) => (
              <div key={axis} className="position-xyz-field">
                <span className="position-axis-label">{axis}</span>
                <input className="position-input" type="number" step="1" value={val} onChange={e => setter(e.target.value)} onKeyDown={handleKeyDown} disabled={!activeModelId} />
              </div>
            ))}
          </div>
        </div>

        <div className="position-field-group" style={{ marginTop: '4px' }}>
          <label className="position-label">Scale</label>
          <div className="position-xyz-row">
            {([['X', sx, setSX], ['Y', sy, setSY], ['Z', sz, setSZ]] as const).map(([axis, val, setter]) => (
              <div key={axis} className="position-xyz-field">
                <span className="position-axis-label">{axis}</span>
                <input className="position-input" type="number" step="0.1" value={val} onChange={e => setter(e.target.value)} onKeyDown={handleKeyDown} disabled={!activeModelId} />
              </div>
            ))}
          </div>
        </div>

        <button
          className="position-apply-btn"
          style={{ marginTop: '8px' }}
          onClick={handleApply}
          disabled={!activeModelId}
        >
          Apply Transform
        </button>

      </div>
    </div>
  )
}
