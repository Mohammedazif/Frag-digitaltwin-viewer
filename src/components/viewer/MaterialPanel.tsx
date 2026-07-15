import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useModelStore } from '@/store/useModelStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { MaterialOverride } from '@/types'

interface MaterialPanelProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
}

export function MaterialPanel({ engineRef }: MaterialPanelProps) {
  const materialPickerActive = useAppStore(s => s.materialPickerActive)
  const setMaterialPickerActive = useAppStore(s => s.setMaterialPickerActive)
  const selectedElement = useAppStore(s => s.selectedMaterialElement)
  
  const currentProject = useProjectStore(s => s.currentProject)
  const setMaterialOverride = useProjectStore(s => s.setMaterialOverride)
  const removeMaterialOverride = useProjectStore(s => s.removeMaterialOverride)
  const models = useModelStore(s => s.models)

  const [targetType, setTargetType] = useState<'item' | 'category'>('item')
  const [materialMode, setMaterialMode] = useState<'color' | 'texture'>('color')
  
  const [color, setColor] = useState('#ffffff')
  const [roughness, setRoughness] = useState('0.8')
  const [metalness, setMetalness] = useState('0.1')
  const [opacity, setOpacity] = useState('1.0')
  const [transparent, setTransparent] = useState(false)
  const [textureDataUrl, setTextureDataUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)

  // Sync open state with active picker
  useEffect(() => {
    if (materialPickerActive) setOpen(true)
  }, [materialPickerActive])

  // When selection changes, attempt to load existing overrides
  useEffect(() => {
    if (selectedElement && currentProject) {
      setOpen(true)
      const targetId = targetType === 'item' ? selectedElement.id : (selectedElement.category || 'unknown')
      const overrideId = `${selectedElement.modelId}_${targetId}`
      const existing = currentProject.materialOverrides?.[overrideId]
      
      if (existing) {
        if (existing.color) setColor(existing.color)
        if (existing.opacity !== undefined) setOpacity(existing.opacity.toString())
        if (existing.transparent !== undefined) setTransparent(existing.transparent)
        
        if (existing.roughness !== undefined || existing.metalness !== undefined || existing.textureDataUrl) {
          setMaterialMode('texture')
          if (existing.roughness !== undefined) setRoughness(existing.roughness.toString())
          if (existing.metalness !== undefined) setMetalness(existing.metalness.toString())
          if (existing.textureDataUrl) setTextureDataUrl(existing.textureDataUrl)
        } else {
          setMaterialMode('color')
          setRoughness('0.8')
          setMetalness('0.1')
          setTextureDataUrl('')
        }
      } else {
        // Defaults
        setColor('#ffffff')
        setOpacity('1.0')
        setTransparent(false)
        setMaterialMode('color')
        setRoughness('0.8')
        setMetalness('0.1')
        setTextureDataUrl('')
      }
    }
  }, [selectedElement, targetType, currentProject])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setTextureDataUrl(event.target.result.toString())
      }
    }
    reader.readAsDataURL(file)
  }

  const handleApply = async () => {
    if (!selectedElement) return

    const targetId = targetType === 'item' ? selectedElement.id : (selectedElement.category || 'unknown')
    const overrideId = `${selectedElement.modelId}_${targetId}`

    const override: MaterialOverride = {
      id: overrideId,
      modelId: selectedElement.modelId,
      targetId,
      targetType,
      color,
      opacity: parseFloat(opacity),
      transparent,
      roughness: materialMode === 'texture' ? parseFloat(roughness) : undefined,
      metalness: materialMode === 'texture' ? parseFloat(metalness) : undefined,
      textureDataUrl: materialMode === 'texture' ? (textureDataUrl || undefined) : undefined
    }

    await setMaterialOverride(selectedElement.modelId, override)
    
    // The actual application to Three.js will be handled by a global effect or utility that watches for overrides
    // but for immediate feedback, we trigger a global event or store flag (or just let the loader hook handle it).
    window.dispatchEvent(new CustomEvent('material-override-updated', { detail: override }))
  }

  const handleReset = async () => {
    if (!selectedElement) return
    const targetId = targetType === 'item' ? selectedElement.id : (selectedElement.category || 'unknown')
    const overrideId = `${selectedElement.modelId}_${targetId}`
    await removeMaterialOverride(selectedElement.modelId, overrideId)
    
    window.dispatchEvent(new CustomEvent('material-override-removed', { 
      detail: { overrideId, modelId: selectedElement.modelId, targetId, targetType } 
    }))
  }

  if (!materialPickerActive && !open) return null

  const activeModelName = selectedElement ? models.find(m => m.modelId === selectedElement.modelId)?.originalFileName : null

  return (
    <div className={`position-panel ${open ? 'open' : ''}`} style={{ marginTop: '10px' }}>
      <button
        className="position-panel-tab"
        onClick={() => {
          setOpen(v => !v)
          if (open) setMaterialPickerActive(false)
        }}
        title={open ? 'Close Material Panel' : 'Open Material Panel'}
        style={{ top: '60px' }} // Offset below position panel
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        <span>Materials</span>
      </button>

      <div className="position-panel-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <div className="position-panel-header">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: 'var(--accent)' }}>
             <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/>
          </svg>
          <span>Material Editor</span>
        </div>

        {!selectedElement ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Click an object in the viewer to edit its material.
          </div>
        ) : (
          <>
            <div className="position-field-group">
              <label className="position-label">Selection Scope</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="radio" checked={targetType === 'item'} onChange={() => setTargetType('item')} />
                  Only this item
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="radio" checked={targetType === 'category'} onChange={() => setTargetType('category')} />
                  Whole Category
                </label>
              </div>
            </div>

            <div className="position-picked-card" style={{ marginTop: '12px' }}>
              <div className="position-picked-title">Selected Element</div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                Model: <b>{activeModelName}</b><br />
                ID: <b>{selectedElement.id}</b><br />
                Category: <b>{selectedElement.category || 'Unknown'}</b>
              </div>
            </div>

            <div className="position-field-group" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                <button 
                  style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', background: materialMode === 'color' ? 'var(--accent)' : 'transparent', color: materialMode === 'color' ? '#fff' : 'var(--text)' }}
                  onClick={() => setMaterialMode('color')}
                >
                  Solid Color
                </button>
                <button 
                  style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', background: materialMode === 'texture' ? 'var(--accent)' : 'transparent', color: materialMode === 'texture' ? '#fff' : 'var(--text)' }}
                  onClick={() => setMaterialMode('texture')}
                >
                  Custom Material
                </button>
              </div>
            </div>

            {materialMode === 'texture' && (
              <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,180,0,0.1)', borderLeft: '3px solid #ffb400', fontSize: '11px', color: 'var(--text-muted)' }}>
                <b>Warning:</b> Custom materials modify the base architectural material. This will affect all other items in the model that share this exact material type.
              </div>
            )}

            <div className="position-field-group" style={{ marginTop: '12px' }}>
              <label className="position-label">Base Color</label>
              <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                style={{ width: '100%', height: '30px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-soft)', padding: '2px', borderRadius: '4px' }} 
              />
            </div>
            
            <div className="position-field-group" style={{ marginTop: '8px' }}>
              <label className="position-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Opacity</span>
                <span>{opacity}</span>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e => setOpacity(e.target.value)} style={{ width: '100%' }} />
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} />
                Enable Transparency
              </label>
            </div>

            {materialMode === 'texture' && (
              <>
                <div className="position-field-group" style={{ marginTop: '16px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                  <label className="position-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Roughness (Matte vs Shiny)</span>
                    <span>{roughness}</span>
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={roughness} onChange={e => setRoughness(e.target.value)} style={{ width: '100%' }} />
                </div>

                <div className="position-field-group" style={{ marginTop: '8px' }}>
                  <label className="position-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Metalness</span>
                    <span>{metalness}</span>
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={metalness} onChange={e => setMetalness(e.target.value)} style={{ width: '100%' }} />
                </div>

                <div className="position-field-group" style={{ marginTop: '12px' }}>
                  <label className="position-label">Custom Texture (e.g. Sand, Brick)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload} 
                    />
                    <button className="position-btn-sm" onClick={() => fileInputRef.current?.click()}>
                      Upload Image
                    </button>
                    {textureDataUrl && (
                      <button className="position-btn-sm muted" onClick={() => setTextureDataUrl('')}>
                        Clear
                      </button>
                    )}
                  </div>
                  {textureDataUrl && (
                    <div style={{ marginTop: '8px', width: '100%', height: '60px', backgroundImage: `url(${textureDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '4px', border: '1px solid var(--border-soft)' }} />
                  )}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="position-apply-btn" onClick={handleApply} style={{ flex: 2 }}>
                Apply Material
              </button>
              <button className="position-apply-btn" onClick={handleReset} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-soft)', color: 'var(--text)' }}>
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
