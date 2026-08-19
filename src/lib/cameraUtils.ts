import * as THREE from 'three'
import type { FragmentsEngine } from './fragmentsEngine'
import { useProjectStore } from '@/store/useProjectStore'


export function resetCameraToHome(engine: FragmentsEngine | null, ignoreProjectCamera = false) {
  if (!engine?.world?.camera?.controls) return

  // 1. Try to use saved project camera first (unless ignored, e.g., when clicking a map pin)
  const camera = useProjectStore.getState().currentProject?.camera
  if (!ignoreProjectCamera && camera) {
    const pos = camera.position as any
    const tgt = camera.target as any
    
    const px = Array.isArray(pos) ? pos[0] : pos.x
    const py = Array.isArray(pos) ? pos[1] : pos.y
    const pz = Array.isArray(pos) ? pos[2] : pos.z
    
    const tx = Array.isArray(tgt) ? tgt[0] : tgt.x
    const ty = Array.isArray(tgt) ? tgt[1] : tgt.y
    const tz = Array.isArray(tgt) ? tgt[2] : tgt.z

    engine.world.camera.controls.setLookAt(px, py, pz, tx, ty, tz, true)
    return
  }

  // 2. If no saved camera, calculate smart isometric overview
  const box = new THREE.Box3()
  if (engine.fragments?.models?.list) {
    for (const [, model] of engine.fragments.models.list as any) {
      const m = model as any
      if (m.boundingBox) {
        box.expandByPoint(m.boundingBox.min)
        box.expandByPoint(m.boundingBox.max)
      } else if (typeof m.traverse === 'function') {
        m.traverse((obj: any) => {
          if (obj.isMesh && typeof obj.updateWorldMatrix === 'function') {
            obj.updateWorldMatrix(true, false)
            box.expandByObject(obj)
          }
        })
      }
    }
  }
  
  const size = new THREE.Vector3()
  box.getSize(size)
  const scale = box.isEmpty() ? 30 : Math.max(size.x, size.y, size.z) * 0.7
  const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
  
  // Isometric offset: normalized 0.58 on each axis
  const f = scale
  engine.world.camera.controls.setLookAt(
    center.x + 0.58 * f,
    center.y + 0.58 * f,
    center.z + 0.58 * f,
    center.x, center.y, center.z,
    true
  )
}
