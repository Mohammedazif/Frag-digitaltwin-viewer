import { useState, useCallback } from 'react'
import { Box3 } from 'three'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useModelStore } from '@/store/useModelStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import { applyModelTransform } from '@/lib/transformUtils'
export function useModelLoader(engineRef: React.MutableRefObject<FragmentsEngine | null>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModel = useCallback(async (fragBytes: ArrayBuffer, modelId: string, type: 'frag' | 'glb' = 'frag', transform?: { position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number] }, fitToBox: boolean = true) => {
    const engine = engineRef.current
    if (!engine) return

    setIsLoading(true)
    setError(null)

    try {
      if (type === 'glb') {
        const existing = engine.world.scene.three.children.find((c: any) => c.userData?.modelId === modelId)
        if (existing) {
          engine.world.scene.three.remove(existing)
        }

        const loader = new GLTFLoader()
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.parse(fragBytes, '', resolve, reject)
        })

        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            for (const mat of materials) {
              if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                mat.metalness = Math.min(mat.metalness, 0.2)
                mat.roughness = Math.max(mat.roughness, 0.4)
                mat.needsUpdate = true
              }
            }
          }
        })

        gltf.scene.userData = { 
          modelId,
          originalPosition: gltf.scene.position.clone(),
          originalRotation: gltf.scene.rotation.clone(),
          originalScale: gltf.scene.scale.clone()
        }

        // Apply saved delta transforms if present
        const hasCustomPosition = transform?.position && (transform.position[0] !== 0 || transform.position[1] !== 0 || transform.position[2] !== 0)
        const hasCustomRotation = transform?.rotation && (transform.rotation[0] !== 0 || transform.rotation[1] !== 0 || transform.rotation[2] !== 0)
        const hasCustomScale = transform?.scale && (transform.scale[0] !== 1 || transform.scale[1] !== 1 || transform.scale[2] !== 1)

        if (hasCustomPosition || hasCustomRotation || hasCustomScale) {
          applyModelTransform(gltf.scene, transform!)
        } else {
          useModelStore.getState().updateModelTransform(modelId, { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] })
        }
        engine.world.scene.three.add(gltf.scene)

        if (fitToBox) {
          try {
            const box = new Box3().setFromObject(gltf.scene)
            if (!box.isEmpty()) {
              await engine.world.camera.controls.fitToBox(box, true)
            }
          } catch {
          }
        }
      } else {
        const existing = engine.fragments.models.list.get(modelId)
        if (existing) await engine.fragments.disposeModel(modelId)

        // Also register model in OBC FragmentsManager so picking tools can find it
        try {
          const obcBuffer = fragBytes.slice(0); // clone to avoid transfer issues
          await (engine.obcFragments as any).core?.load?.(obcBuffer, { modelId });
        } catch (e) {
          console.warn('OBC.FragmentsManager load failed:', e);
        }

        const model = await engine.fragments.load(fragBytes, { modelId })
        model.useCamera(engine.world.camera.three)

        model.object.userData.originalPosition = model.object.position.clone()
        model.object.userData.originalRotation = model.object.rotation.clone()
        model.object.userData.originalScale = model.object.scale.clone()
        model.object.userData.modelId = modelId

        // Apply saved delta transforms only if they are non-default (i.e. user has previously positioned this model)
        const hasCustomPosition = transform?.position && (transform.position[0] !== 0 || transform.position[1] !== 0 || transform.position[2] !== 0)
        const hasCustomRotation = transform?.rotation && (transform.rotation[0] !== 0 || transform.rotation[1] !== 0 || transform.rotation[2] !== 0)
        const hasCustomScale = transform?.scale && (transform.scale[0] !== 1 || transform.scale[1] !== 1 || transform.scale[2] !== 1)

        if (hasCustomPosition || hasCustomRotation || hasCustomScale) {
          applyModelTransform(model.object, transform!)
        } else {
          // Initialize state with 0 offsets
          useModelStore.getState().updateModelTransform(modelId, { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] })
        }

        engine.world.scene.three.add(model.object)
        await engine.fragments.update(true)

        // IFC spaces
        try {
          const spaceLocalIds = await model.getItemsByQuery({
            categories: [/IFCSPACE/]
          })
          
          if (spaceLocalIds && spaceLocalIds.length > 0) {
            await model.setOpacity(spaceLocalIds, 0.01)
            // await model.setColor(spaceLocalIds, new THREE.Color(0x88ccff))
          }
        } catch (e) {
          console.warn('[GlassSpaces] Could not apply glass spaces styling:', e)
        }

        if (fitToBox) {
          try {
            const box = new Box3().setFromObject(model.object)
            if (!box.isEmpty()) {
              await engine.world.camera.controls.fitToBox(box, true)
            }
          } catch {
          }
        }
        
        // Notify that the model is fully loaded so overrides can be applied
        window.dispatchEvent(new CustomEvent('model-loaded', { detail: { modelId } }))
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load model')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { loadModel, isLoading, error }
}
