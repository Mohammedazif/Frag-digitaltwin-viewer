import { useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '@/store/useProjectStore'
import { useModelStore } from '@/store/useModelStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { MaterialOverride } from '@/types'

export function useMaterialOverrides(engineRef: React.MutableRefObject<FragmentsEngine | null>) {
  const currentProject = useProjectStore(s => s.currentProject)
  const models = useModelStore(s => s.models)

  const applyOverride = useCallback(async (modelId: string, override: MaterialOverride) => {
    const engine = engineRef.current
    if (!engine) {
       return
    }

    let fragModel: any = engine.fragments.models.list.get(modelId)
    const allModelKeys = [...(engine.fragments.models.list.keys?.() || [])]
    
    // If not found directly, try to match by UUID or any other stored key
    if (!fragModel && allModelKeys.length > 0) {
      // Try to find by iterating - some engines store with different key format
      for (const [key, val] of engine.fragments.models.list.entries()) {
        if ((val as any).modelId === modelId || key === modelId) {
          fragModel = val
          break
        }
      }
    }

    let items: number[] = []

    if (fragModel) {
      if (override.targetType === 'category' && typeof override.targetId === 'string') {
        const query = new RegExp(override.targetId, 'i')
        try {
          items = await fragModel.getItemsByQuery({ categories: [query] }) || []
        } catch (e) {
          console.warn('Could not query category', e)
        }
      } else {
        items = [Number(override.targetId)]
      }
      if (items.length > 0) {
        const hasProperties = override.color || override.opacity !== undefined || override.roughness !== undefined || override.metalness !== undefined || override.textureDataUrl !== undefined;
        // ... rest of the fragModel block remains the same ...
        if (hasProperties) {
           const canUseInstanceColoring = typeof fragModel.setColor === 'function';

           if (canUseInstanceColoring && override.color) {
             fragModel.setColor(items, new THREE.Color(override.color)).catch((err: any) => console.error('[MaterialOverrides] setColor error:', err));
           }
           if (typeof fragModel.setOpacity === 'function' && override.opacity !== undefined) {
             fragModel.setOpacity(items, override.opacity).catch((err: any) => console.error('[MaterialOverrides] setOpacity error:', err));
           }

           const hasMaterialProps = override.roughness !== undefined || override.metalness !== undefined || override.textureDataUrl !== undefined;
           
           // In Fragments/InstancedMesh, items share base materials across different categories. 
           // Mutating the base material WILL bleed to other categories (like ruining all glass).
           // We avoid doing this for purely color changes (since instance coloring handles it).
           // But if the user provides a custom texture, roughness, or metalness, we HAVE to mutate the shared material.
           const shouldMutateSharedMaterial = !canUseInstanceColoring || hasMaterialProps;

           if ((hasMaterialProps || !canUseInstanceColoring) && shouldMutateSharedMaterial) {
             let fragMap: Record<string, any> | null = null;
             if (typeof fragModel.getFragmentMap === 'function') {
               try { fragMap = fragModel.getFragmentMap(items); } catch(e) {}
             }
             
             let appliedCount = 0;
             const rootObj = fragModel.object || fragModel;
             if (typeof rootObj.traverse === 'function') {
               rootObj.traverse((child: any) => {
                 if (child.isMesh && child.material) {
                    let shouldApply = false;
                    if (fragMap) {
                      if (fragMap[child.id] || fragMap[child.uuid]) shouldApply = true;
                    } else {
                      shouldApply = true;
                    }
                    
                    if (shouldApply) {
                      appliedCount++;
                      const skipColor = canUseInstanceColoring;
                      applyToMaterial(child, override, skipColor);
                    }
                 }
               });
             }
           }
        } else {
           if (typeof fragModel.resetColor === 'function') fragModel.resetColor(items).catch(() => {})
           if (typeof fragModel.resetOpacity === 'function') fragModel.resetOpacity(items).catch(() => {})
           
           // Also reset material props to defaults if we can
           const rootObj = fragModel.object || fragModel;
           if (typeof rootObj.traverse === 'function') {
             let fragMap: Record<string, any> | null = null;
             if (typeof fragModel.getFragmentMap === 'function') {
               try { fragMap = fragModel.getFragmentMap(items); } catch(e) {}
             }
             rootObj.traverse((child: any) => {
               if (child.isMesh && child.material) {
                  let shouldApply = false;
                  if (fragMap) {
                    if (fragMap[child.id] || fragMap[child.uuid]) shouldApply = true;
                  } else {
                    shouldApply = true;
                  }
                  if (shouldApply) {
                     // Create a dummy override to reset to defaults
                     applyToMaterial(child, {
                       id: 'reset',
                       modelId: '',
                       targetId: '',
                       targetType: 'item',
                       roughness: 0.8,
                       metalness: 0.1,
                       textureDataUrl: ''
                     }, true); // skipColor = true so we don't overwrite base color on reset
                  }
               }
             });
           }
        }
      }
    } else {
      const glbObj = engine.world.scene.three.children.find(
        (c: THREE.Object3D) => c.userData?.modelId === modelId
      )
      if (glbObj) {
        // For GLB, we can just apply to the whole model for now since item selection in GLB is complex without proper hierarchy
        glbObj.traverse((child: any) => {
          if (child.isMesh && child.material) {
            applyToMaterial(child, override)
          }
        })
      }
    }

  }, [])

  const applyToMaterial = (mesh: THREE.Mesh, override: MaterialOverride, skipColor: boolean = false) => {
    const apply = (mat: any) => {
      if (mat && mat.isMaterial) {
        if (!skipColor && override.color && mat.color) mat.color.set(override.color)
        if (override.roughness !== undefined && 'roughness' in mat) mat.roughness = override.roughness
        if (override.metalness !== undefined && 'metalness' in mat) mat.metalness = override.metalness
        if (override.opacity !== undefined) {
          mat.opacity = override.opacity
          mat.transparent = override.transparent || override.opacity < 1.0
        }
        if (override.textureDataUrl && 'map' in mat) {
          new THREE.TextureLoader().load(override.textureDataUrl, (tex) => {
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.repeat.set(10, 10) // Basic repeat to prevent stretching on huge meshes
            mat.map = tex
            mat.needsUpdate = true
          })
        } else if (override.textureDataUrl === '' && 'map' in mat) {
           mat.map = null
        }
        mat.needsUpdate = true
      }
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(apply)
    } else if (mesh.material) {
      apply(mesh.material)
    }
  }

  // Apply all saved overrides when a model loads or when overrides change
  useEffect(() => {
    if (!currentProject?.materialOverrides) return
    
    const overrides = Object.values(currentProject.materialOverrides)
    // Sort so that category overrides are applied first, then item overrides
    overrides.sort((a, b) => {
      if (a.targetType === 'category' && b.targetType === 'item') return -1;
      if (a.targetType === 'item' && b.targetType === 'category') return 1;
      return 0;
    })
    
    // Function to apply all overrides for a given model
    const applyForModel = async (modelId: string) => {
      for (const override of overrides) {
        if (override.modelId === modelId) {
          await applyOverride(modelId, override)
        }
      }
    }
    
    // 1. Apply to existing already-loaded models
    if (engineRef.current?.fragments.models.list.size) {
      for (const modelId of engineRef.current.fragments.models.list.keys()) {
        applyForModel(modelId as string)
      }
    }

    // 2. Listen for newly loaded models from useModelLoader
    const handleModelLoaded = (e: any) => {
      const { modelId } = e.detail
      applyForModel(modelId)
    }

    // 3. Listen for dynamic updates from the UI
    const handleUpdate = (e: any) => {
      const override = e.detail as MaterialOverride
      applyOverride(override.modelId, override)
    }
    const handleRemoved = (e: any) => {
      const { modelId, targetId, targetType } = e.detail
      const override = { modelId, targetId, targetType } as MaterialOverride
      applyOverride(modelId, override)
    }

    window.addEventListener('model-loaded', handleModelLoaded)
    window.addEventListener('material-override-updated', handleUpdate)
    window.addEventListener('material-override-removed', handleRemoved)
    
    return () => {
      window.removeEventListener('model-loaded', handleModelLoaded)
      window.removeEventListener('material-override-updated', handleUpdate)
      window.removeEventListener('material-override-removed', handleRemoved)
    }
  }, [currentProject?.materialOverrides, applyOverride])
}
