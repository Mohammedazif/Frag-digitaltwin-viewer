import * as FRAGS from '@thatopen/fragments'
import { WASM_PATH } from '@/constants/config'

export interface ConversionResult {
  fragBytes: ArrayBuffer
  conversionTimeMs: number
}

export async function convertIfcToFrag(
  bytes: Uint8Array,
  onProgress: (progress: number, label: string) => void
): Promise<ConversionResult> {
  const serializer = new FRAGS.IfcImporter()
  serializer.wasm = {
    absolute: true,
    path: WASM_PATH,
  }

  const start = performance.now()

  const result = await serializer.process({
    bytes,
    progressCallback: (progress: number, data: any) => {
      const label = data?.state ?? ''
      onProgress(progress, label)
    },
  })

  const conversionTimeMs = performance.now() - start
  // IfcImporter returns Uint8Array backed by WASM memory (potentially SharedArrayBuffer).
  // We MUST copy it into a standard ArrayBuffer so the File System API can write it without yielding 0-byte files.
  let fragBytes: ArrayBuffer
  if (result instanceof Uint8Array) {
    fragBytes = new ArrayBuffer(result.byteLength)
    new Uint8Array(fragBytes).set(new Uint8Array(result.buffer, result.byteOffset, result.byteLength))
  } else {
    const src = new Uint8Array(result as unknown as ArrayBuffer)
    fragBytes = new ArrayBuffer(src.byteLength)
    new Uint8Array(fragBytes).set(src)
  }

  return { fragBytes, conversionTimeMs }
}
