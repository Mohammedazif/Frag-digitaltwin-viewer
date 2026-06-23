import type { FragmentsEngine } from './fragmentsEngine'


export function captureCanvasThumbnail(engine?: FragmentsEngine | null, maxWidth = 320): string | null {

  if (engine?.world?.renderer && engine?.world?.scene && engine?.world?.camera) {
    try {
      const renderer = engine.world.renderer.three
      const scene = engine.world.scene.three
      const camera = engine.world.camera.three
      renderer.render(scene, camera)
    } catch {
    }
  }

  const canvas = document.querySelector('.viewer-canvas-container canvas') as HTMLCanvasElement | null
  if (!canvas) return null

  const scale = Math.min(1, maxWidth / canvas.width)
  const w = Math.round(canvas.width * scale)
  const h = Math.round(canvas.height * scale)

  const offscreen = document.createElement('canvas')
  offscreen.width = w
  offscreen.height = h

  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(canvas, 0, 0, w, h)

  let dataUrl = offscreen.toDataURL('image/webp', 0.75)
  if (!dataUrl || dataUrl.length < 100) {
    dataUrl = offscreen.toDataURL('image/png', 0.8)
  }
  return dataUrl
}
