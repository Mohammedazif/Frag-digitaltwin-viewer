import { useRef, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { useIfcConverter } from '@/hooks/useIfcConverter'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { useProjectStore } from '@/store/useProjectStore'
import { captureCanvasThumbnail } from '@/lib/thumbnailCapture'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { LoadedModel } from '@/types'

export default function App() {
  const engineRef = useRef<FragmentsEngine | null>(null)
  const setStep = useAppStore(s => s.setStep)
  const addModel = useModelStore(s => s.addModel)

  const currentProject = useProjectStore(s => s.currentProject)
  const addModelEntry = useProjectStore(s => s.addModelEntry)
  const updateThumbnail = useProjectStore(s => s.updateThumbnail)

  // Called immediately after a model is converted — saves to project folder
  const handleModelConverted = useCallback(async (model: LoadedModel) => {
    if (currentProject) {
      await addModelEntry(model)
      // Capture thumbnail after a short render delay
      setTimeout(async () => {
        const thumb = captureCanvasThumbnail()
        if (thumb) await updateThumbnail(thumb)
      }, 2500)
    }
  }, [currentProject, addModelEntry, updateThumbnail])

  const { convert } = useIfcConverter({ onConverted: handleModelConverted })

  // Handle files dropped/selected from upload zone
  const handleFiles = useCallback(async (files: File[]) => {
    setStep('uploading')

    for (const file of files) {
      const isFragFile = file.name.toLowerCase().endsWith('.frag')

      if (isFragFile) {
        // Direct .frag load — no conversion needed
        const buffer = await file.arrayBuffer()
        const model: LoadedModel = {
          modelId: `model-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
          originalFileName: file.name,
          originalFileSizeBytes: file.size,
          convertedFileSizeBytes: buffer.byteLength,
          conversionTimeMs: 0,
          fragBytes: buffer,
        }
        addModel(model)
        if (currentProject) {
          await addModelEntry(model)
        }
        setStep('viewing')
      } else {
        // IFC → convert → onConverted callback fires → saves to project
        const buffer = await file.arrayBuffer()
        await convert(new Uint8Array(buffer), file.name, file.size)
      }
    }
  }, [convert, addModel, addModelEntry, currentProject, setStep])

  const handleEngineReady = useCallback(
    (ref: React.MutableRefObject<FragmentsEngine | null>) => {
      engineRef.current = ref.current
    },
    []
  )

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar onFiles={handleFiles} engineRef={engineRef} />
        <main className="app-main">
          <ViewerCanvas onEngineReady={handleEngineReady} />
        </main>
      </div>
    </div>
  )
}
