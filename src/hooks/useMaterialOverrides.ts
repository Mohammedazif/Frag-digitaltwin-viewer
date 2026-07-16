import { useEffect, useCallback, useRef } from 'react'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { useProjectStore } from '@/store/useProjectStore'
import { useModelStore } from '@/store/useModelStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { MaterialOverride } from '@/types'

export function useMaterialOverrides(engineRef: React.MutableRefObject<FragmentsEngine | null>) {
  const currentProject = useProjectStore(s => s.currentProject)
  const models = useModelStore(s => s.models)
  const isolatedMeshesRef = useRef<Record<string, { mesh: THREE.Mesh, modelId: string, items: number[] }>>({})

  const applyOverride = useCallback(async (modelId: string, override: MaterialOverride) => {
    const engine = engineRef.current
    if (!engine) {
       return
    }

    let fragModel: any = engine.fragments.models.list.get(modelId)
    const allModelKeys = [...(engine.fragments.models.list.keys?.() || [])]
    
    if (!fragModel && allModelKeys.length > 0) {
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
        if (hasProperties) {
           const canUseInstanceColoring = typeof fragModel.setColor === 'function';

           if (canUseInstanceColoring && override.color) {
             fragModel.setColor(items, new THREE.Color(override.color)).catch((err: any) => console.error('[MaterialOverrides] setColor error:', err));
           }
           if (typeof fragModel.setOpacity === 'function' && override.opacity !== undefined) {
             fragModel.setOpacity(items, override.opacity).catch((err: any) => console.error('[MaterialOverrides] setOpacity error:', err));
           }

           const hasMaterialProps = override.roughness !== undefined || override.metalness !== undefined || override.textureDataUrl !== undefined;
           
           if (canUseInstanceColoring && hasMaterialProps) {
              const overrideId = override.id;
              
              if (overrideId) {
                 const old = isolatedMeshesRef.current[overrideId];
                 if (old && old.mesh) {
                    if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
                    if (old.mesh.geometry) old.mesh.geometry.dispose();
                    if (old.mesh.material) {
                       if (Array.isArray(old.mesh.material)) old.mesh.material.forEach(m => m.dispose());
                       else (old.mesh.material as THREE.Material).dispose();
                    }
                 }
                 delete isolatedMeshesRef.current[overrideId];

                 const toRemove: THREE.Object3D[] = [];
                 const searchRoots = [engine.world.scene.three];
                 if (fragModel && fragModel.object) searchRoots.push(fragModel.object);
                 
                 searchRoots.forEach(root => {
                    root.children.forEach(child => {
                       if (child.name === 'material_override_' + overrideId) {
                          toRemove.push(child);
                       }
                    });
                 });
                 toRemove.forEach(child => {
                    if (child.parent) child.parent.remove(child);
                    const mesh = child as THREE.Mesh;
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) {
                       if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                       else (mesh.material as THREE.Material).dispose();
                    }
                 });
              }

              if (typeof fragModel.getItemsGeometry === 'function') {
                 const geometries = await fragModel.getItemsGeometry(items);
                 if (geometries) {
                    let totalPositions = 0;
                    let totalIndices = 0;
                    for (const itemGeom of geometries) {
                       if (!itemGeom) continue;
                       for (const meshData of itemGeom) {
                          if (!meshData.positions) continue;
                          totalPositions += meshData.positions.length / 3;
                          totalIndices += meshData.indices ? meshData.indices.length : meshData.positions.length / 3;
                       }
                    }

                    if (totalPositions > 0) {

                       const rawPos = new Float32Array(totalPositions * 3);
                       const rawIndices = new Uint32Array(totalIndices);
                       
                       let posOffset = 0;
                       let idxOffset = 0;
                       let vertexOffset = 0;
                       const tempVec = new THREE.Vector3();

                       for (let gIdx = 0; gIdx < geometries.length; gIdx++) {
                          const itemGeom = geometries[gIdx];
                          if (!itemGeom) continue;
                          for (const meshData of itemGeom) {
                             if (!meshData.positions) continue;
                             
                             let matrix = new THREE.Matrix4();
                             if (meshData.transform instanceof THREE.Matrix4) {
                               matrix.copy(meshData.transform);
                             } else if (Array.isArray(meshData.transform)) {
                               matrix.fromArray(meshData.transform);
                             } else if ((meshData.transform as any).elements) {
                               matrix.fromArray((meshData.transform as any).elements);
                             }
                             
                             const pos = meshData.positions;
                             for (let i = 0; i < pos.length; i += 3) {
                               tempVec.set(pos[i], pos[i + 1], pos[i + 2]);
                               tempVec.applyMatrix4(matrix);
                               rawPos[posOffset++] = tempVec.x;
                               rawPos[posOffset++] = tempVec.y;
                               rawPos[posOffset++] = tempVec.z;
                             }
                             
                             if (meshData.indices) {
                               for (let i = 0; i < meshData.indices.length; i++) {
                                 rawIndices[idxOffset++] = meshData.indices[i] + vertexOffset;
                               }
                             } else {
                               for (let i = 0; i < pos.length / 3; i++) {
                                 rawIndices[idxOffset++] = i + vertexOffset;
                               }
                             }
                             
                             vertexOffset += pos.length / 3;
                          }
                       }

                       const unrolledPositions = new Float32Array(totalIndices * 3);
                       const unrolledUVs = new Float32Array(totalIndices * 2);
                       const faceToExpressId = new Int32Array(totalIndices / 3);
                       
                       const v0 = new THREE.Vector3();
                       const v1 = new THREE.Vector3();
                       const v2 = new THREE.Vector3();
                       const cb = new THREE.Vector3();
                       const ab = new THREE.Vector3();
                       
                       let unrolledIdx = 0;
                       let faceIdx = 0;
                       
                       let currentItemIdx = 0;
                       let indicesProcessed = 0;
                       let indicesForCurrentItem = 0;
                       
                       const itemIndexCounts = [];
                       for (let gIdx = 0; gIdx < geometries.length; gIdx++) {
                          const itemGeom = geometries[gIdx];
                          let count = 0;
                          if (itemGeom) {
                             for (const meshData of itemGeom) {
                                count += meshData.indices ? meshData.indices.length : (meshData.positions.length / 3);
                             }
                          }
                          itemIndexCounts.push(count);
                       }
                       
                       if (itemIndexCounts.length > 0) {
                           indicesForCurrentItem = itemIndexCounts[0];
                       }

                       for (let i = 0; i < totalIndices; i += 3) {
                          while (indicesProcessed >= indicesForCurrentItem && currentItemIdx < itemIndexCounts.length - 1) {
                             currentItemIdx++;
                             indicesProcessed = 0;
                             indicesForCurrentItem = itemIndexCounts[currentItemIdx];
                          }
                          faceToExpressId[faceIdx++] = Number(items[currentItemIdx]);
                          indicesProcessed += 3;

                          const i0 = rawIndices[i];
                          const i1 = rawIndices[i+1];
                          const i2 = rawIndices[i+2];
                          
                          v0.set(rawPos[i0*3], rawPos[i0*3+1], rawPos[i0*3+2]);
                          v1.set(rawPos[i1*3], rawPos[i1*3+1], rawPos[i1*3+2]);
                          v2.set(rawPos[i2*3], rawPos[i2*3+1], rawPos[i2*3+2]);
                          
                          // Write positions
                          unrolledPositions[unrolledIdx*3] = v0.x; unrolledPositions[unrolledIdx*3+1] = v0.y; unrolledPositions[unrolledIdx*3+2] = v0.z;
                          unrolledPositions[unrolledIdx*3+3] = v1.x; unrolledPositions[unrolledIdx*3+4] = v1.y; unrolledPositions[unrolledIdx*3+5] = v1.z;
                          unrolledPositions[unrolledIdx*3+6] = v2.x; unrolledPositions[unrolledIdx*3+7] = v2.y; unrolledPositions[unrolledIdx*3+8] = v2.z;
                          
                          // Compute Normal
                          cb.subVectors(v2, v1);
                          ab.subVectors(v0, v1);
                          cb.cross(ab).normalize();
                          
                          const nx = Math.abs(cb.x);
                          const ny = Math.abs(cb.y);
                          const nz = Math.abs(cb.z);
                          
                          // Box Projection UVs
                          if (nx >= ny && nx >= nz) {
                             // X-facing wall
                             unrolledUVs[unrolledIdx*2] = v0.z; unrolledUVs[unrolledIdx*2+1] = v0.y;
                             unrolledUVs[unrolledIdx*2+2] = v1.z; unrolledUVs[unrolledIdx*2+3] = v1.y;
                             unrolledUVs[unrolledIdx*2+4] = v2.z; unrolledUVs[unrolledIdx*2+5] = v2.y;
                          } else if (ny >= nx && ny >= nz) {
                             // Y-facing floor/ceiling
                             unrolledUVs[unrolledIdx*2] = v0.x; unrolledUVs[unrolledIdx*2+1] = v0.z;
                             unrolledUVs[unrolledIdx*2+2] = v1.x; unrolledUVs[unrolledIdx*2+3] = v1.z;
                             unrolledUVs[unrolledIdx*2+4] = v2.x; unrolledUVs[unrolledIdx*2+5] = v2.z;
                          } else {
                             // Z-facing wall
                             unrolledUVs[unrolledIdx*2] = v0.x; unrolledUVs[unrolledIdx*2+1] = v0.y;
                             unrolledUVs[unrolledIdx*2+2] = v1.x; unrolledUVs[unrolledIdx*2+3] = v1.y;
                             unrolledUVs[unrolledIdx*2+4] = v2.x; unrolledUVs[unrolledIdx*2+5] = v2.y;
                          }
                          
                          unrolledIdx += 3;
                       }

                       const geom = new THREE.BufferGeometry();
                       geom.setAttribute('position', new THREE.BufferAttribute(unrolledPositions, 3));
                       geom.setAttribute('uv', new THREE.BufferAttribute(unrolledUVs, 2));
                       geom.computeVertexNormals();

                       const newMesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xffffff }));
                       if (overrideId) newMesh.name = 'material_override_' + overrideId;
                       newMesh.userData = { 
                          modelId: modelId, 
                          expressId: items[0],
                          faceToExpressId: faceToExpressId
                       };
                       
                       if (fragModel.object) {
                           fragModel.object.add(newMesh);
                       } else {
                           engine.world.scene.three.add(newMesh);
                       }
                       
                       applyToMaterial(newMesh, override, false);
                       
                       if (overrideId) {
                         isolatedMeshesRef.current[overrideId] = {
                            mesh: newMesh,
                            modelId: modelId,
                            items: items
                         };
                       }

                       // Hide originals
                        try {
                           if (typeof fragModel.getItemsGeometry === 'function') {
                              if (typeof fragModel.setVisible === 'function') {
                                 fragModel.setVisible(items, false);
                              } else {
                                 const hider = engine.components.get(OBC.Hider);
                                 const modelIdMap = { [modelId]: new Set(items) };
                                 hider.set(false, modelIdMap);
                              }
                           } else {
                             const rootObj = fragModel.object || fragModel;
                             if (typeof rootObj.traverse === 'function') {
                                rootObj.traverse((child: any) => {
                                  if (child.isMesh && child.material) {
                                     child.visible = false;
                                     if (!child.userData) child.userData = {};
                                     child.userData.__hiddenByOverride = true;
                                  }
                                });
                             }
                          }
                       } catch (e) {
                          console.warn('[MaterialOverrides] Could not hide original items:', e);
                       }
                    }
                 }
              }
           } else if (!canUseInstanceColoring && hasMaterialProps) {
              let fragMap: Record<string, any> | null = null;
              if (typeof fragModel.getFragmentMap === 'function') {
                try { fragMap = fragModel.getFragmentMap(items); } catch(e) {}
              }
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
                     if (shouldApply) applyToMaterial(child, override, false);
                  }
                });
              }
           }
        } else {
           if (typeof fragModel.resetColor === 'function') fragModel.resetColor(items).catch(() => {})
           if (typeof fragModel.resetOpacity === 'function') fragModel.resetOpacity(items).catch(() => {})
           
           const overrideId = override.id;
           if (overrideId) {
              const old = isolatedMeshesRef.current[overrideId];
              if (old && old.mesh) {
                 if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
                 if (old.mesh.geometry) old.mesh.geometry.dispose();
                 if (old.mesh.material) {
                    if (Array.isArray(old.mesh.material)) old.mesh.material.forEach(m => m.dispose());
                    else (old.mesh.material as THREE.Material).dispose();
                 }
              }

              const toRemove: THREE.Object3D[] = [];
              const searchRoots = [engine.world.scene.three];
              if (fragModel && fragModel.object) searchRoots.push(fragModel.object);
              
              searchRoots.forEach(root => {
                 root.children.forEach(child => {
                    if (child.name === 'material_override_' + overrideId) {
                       toRemove.push(child);
                    }
                 });
              });
              toRemove.forEach(child => {
                 if (child.parent) child.parent.remove(child);
                 const mesh = child as THREE.Mesh;
                 if (mesh.geometry) mesh.geometry.dispose();
                 if (mesh.material) {
                    if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                    else (mesh.material as THREE.Material).dispose();
                 }
              });
              
              if (old) {
                 delete isolatedMeshesRef.current[overrideId];
                             // Unhide originals
               try {
                  if (typeof fragModel.setVisible === 'function') {
                     fragModel.setVisible(old.items, true);
                  }
                  
                  const rootObj = fragModel.object || fragModel;
                  if (typeof rootObj.traverse === 'function') {
                     rootObj.traverse((child: any) => {
                        if (child.userData && child.userData.__hiddenByOverride) {
                           child.visible = true;
                           delete child.userData.__hiddenByOverride;
                        }
                     });
                  }
                  
                  console.log('[MaterialOverrides] Reset visibility for model', modelId, 'items:', old.items.length);
               } catch(e) {}
               }
           }

           if (!overrideId && typeof fragModel.getFragmentMap !== 'function') {
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
                         applyToMaterial(child, {
                           id: 'reset',
                           modelId: '',
                           targetId: '',
                           targetType: 'item',
                           roughness: 0.8,
                           metalness: 0.1,
                           textureDataUrl: ''
                         }, true);
                      }
                   }
                 });
               }
           }
        }
      }
    } else {
      const glbObj = engine.world.scene.three.children.find(
        (c: THREE.Object3D) => c.userData?.modelId === modelId
      )
      if (glbObj) {
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
            const scale = override.textureScale !== undefined ? override.textureScale : 0.001
            tex.repeat.set(scale, scale)
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

  useEffect(() => {
    if (!currentProject?.materialOverrides) {
        for (const overrideId in isolatedMeshesRef.current) {
            const old = isolatedMeshesRef.current[overrideId];
            if (old.mesh.parent) {
                old.mesh.parent.remove(old.mesh);
            } else if (engineRef.current) {
                engineRef.current.world.scene.three.remove(old.mesh);
            }
            if (old.mesh.geometry) old.mesh.geometry.dispose();
            delete isolatedMeshesRef.current[overrideId];
        }
        return;
    }
    
    const overrides = Object.values(currentProject.materialOverrides)
    overrides.sort((a, b) => {
      if (a.targetType === 'category' && b.targetType === 'item') return -1;
      if (a.targetType === 'item' && b.targetType === 'category') return 1;
      return 0;
    })
    
    const applyForModel = async (modelId: string) => {
      for (const override of overrides) {
        if (override.modelId === modelId) {
          await applyOverride(modelId, override)
        }
      }
    }
    
    if (engineRef.current?.fragments.models.list.size) {
      for (const modelId of engineRef.current.fragments.models.list.keys()) {
        applyForModel(modelId as string)
      }
    }

    const handleModelLoaded = (e: any) => {
      const { modelId } = e.detail
      
      const toRemove: THREE.Object3D[] = [];
      engineRef.current?.world.scene.three.traverse(child => {
         if (child.name?.startsWith('material_override_') && child.userData?.modelId === modelId) {
            toRemove.push(child);
         }
      });
      toRemove.forEach(child => {
         if (child.parent) child.parent.remove(child);
         const mesh = child as THREE.Mesh;
         if (mesh.geometry) mesh.geometry.dispose();
         if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
            else (mesh.material as THREE.Material).dispose();
         }
      });
      
      for (const overrideId in isolatedMeshesRef.current) {
         if (isolatedMeshesRef.current[overrideId].modelId === modelId) {
            delete isolatedMeshesRef.current[overrideId];
         }
      }

      applyForModel(modelId)
    }

    const handleUpdate = (e: any) => {
      const override = e.detail as MaterialOverride
      applyOverride(override.modelId, override)
    }
    const handleRemoved = (e: any) => {
      const { modelId, targetId, targetType, overrideId } = e.detail
      const override = { id: overrideId, modelId, targetId, targetType } as MaterialOverride
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
