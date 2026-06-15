/**
 * Capture the current Three.js canvas as a thumbnail data-URL.
 * Resizes down to `maxWidth` to keep IndexedDB storage small.
 */
export function captureCanvasThumbnail(maxWidth = 320): string | null {
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
  return offscreen.toDataURL('image/webp', 0.75)
}
