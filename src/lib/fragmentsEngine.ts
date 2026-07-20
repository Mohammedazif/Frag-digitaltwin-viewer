import * as FRAGS from '@thatopen/fragments'
import { CloudShader } from './CloudShader'
import { CloudShadowShader } from './CloudShadowShader'
import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { ColorGradeShader } from './ColorGradeShader'
import { GodRayShader } from './GodRayShader'
import { CustomEdgeShader } from './CustomEdgeShader'
import * as SunCalc from 'suncalc'
import { PBR_MATERIAL_MAPPINGS } from '../constants/pbrMaterials'
import { N8AOPass } from 'n8ao'

export interface FragmentsEngine {
  fragments: FRAGS.FragmentsModels
  obcFragments: OBC.FragmentsManager
  world: any
  components: OBC.Components
  dispose: () => Promise<void>
  setLightingParams: (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, bloomEnabled?: boolean, fogDensity: number, cloudDensity: number, cloudShadowsEnabled?: boolean, cloudSpeed: number, dofEnabled: boolean, dofFocus: number, dofAperture: number, dofMaxBlur: number, visualSaturation?: number, visualTemperature?: number, visualContrast?: number, visualVignette?: number, godRaysEnabled?: boolean, godRayStrength?: number, chromaticAberration?: number, autoFocus?: boolean, ambientOcclusion?: boolean, outlineEdges?: boolean, pbrMaterials?: boolean }) => void
}

export async function initFragmentsEngine(
  container: HTMLDivElement
): Promise<FragmentsEngine> {
  const components = new OBC.Components()
  const worlds = components.get(OBC.Worlds)

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >()

  world.scene = new OBC.SimpleScene(components)
  world.scene.setup()
  world.scene.three.background = null

  world.renderer = new OBC.SimpleRenderer(components, container, { preserveDrawingBuffer: true, antialias: true })
  
  // Prepare Environment
  const pmremGenerator = new THREE.PMREMGenerator(world.renderer.three)
  pmremGenerator.compileEquirectangularShader()
  const envScene = new RoomEnvironment()
  let envTexture = pmremGenerator.fromScene(envScene, 0.04).texture
  envScene.dispose()

  // Load Photorealistic HDRI
  const rgbeLoader = new RGBELoader()
  rgbeLoader.load('/hdri/venice_sunset_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    const hdriTexture = pmremGenerator.fromEquirectangular(texture).texture
    envTexture = hdriTexture
    if (isRealistic) {
      world.scene.three.environment = envTexture
    }
    texture.dispose()
  })

  // Realistic Lights & Environment
  const realisticGroup = new THREE.Group()
  
  // Sky
  const sky = new Sky()
  sky.name = 'SkyDome'
  sky.scale.setScalar(500000)
  
  const skyUniforms = sky.material.uniforms
  skyUniforms['turbidity'].value = 10
  skyUniforms['rayleigh'].value = 2
  skyUniforms['mieCoefficient'].value = 0.005
  skyUniforms['mieDirectionalG'].value = 0.8
  
  const rAmbient = new THREE.HemisphereLight(0xffffff, 0x444455, 0.4)
  
  const rDir = new THREE.DirectionalLight(0xffeedd, 1.2)
  rDir.position.set(500, 1000, 500)
  rDir.castShadow = true
  
  // Map Size
  rDir.shadow.mapSize.width = 4096
  rDir.shadow.mapSize.height = 4096
  rDir.shadow.camera.near = 10
  rDir.shadow.camera.far = 20000
  rDir.shadow.camera.left = -5000
  rDir.shadow.camera.right = 5000
  rDir.shadow.camera.top = 5000
  rDir.shadow.camera.bottom = -5000
  rDir.shadow.bias = -0.0005
  rDir.shadow.normalBias = 0.05
  rDir.shadow.camera.layers.enable(11)

  // Clouds
  const cloudGeo = new THREE.SphereGeometry(190000, 64, 64)
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(CloudShader.uniforms),
    vertexShader: CloudShader.vertexShader,
    fragmentShader: CloudShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.NormalBlending
  })
  
  const cloudsDome = new THREE.Mesh(cloudGeo, cloudMat)
  cloudsDome.name = 'CloudsDome'

  realisticGroup.add(sky, rAmbient, rDir, cloudsDome)
  world.scene.three.add(realisticGroup)

  let isRealistic = false
  let bloomPass: UnrealBloomPass
  let currentCloudSpeed = 1.0
  let bokehPass: any
  let ssaoPass: any
  let ssrPass: any
  let colorGradePass: any
  let cloudShadowPass: any
  let godRayPass: any
  let edgePass: any
  let sceneDepthRT: THREE.WebGLRenderTarget
  let autoFocusEnabled = false
  let isPbrEnabled = true

  const setLightingParams = (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, bloomEnabled?: boolean, fogDensity: number, cloudDensity: number, cloudShadowsEnabled?: boolean, cloudSpeed: number, dofEnabled: boolean, dofFocus: number, dofAperture: number, dofMaxBlur: number, visualSaturation?: number, visualTemperature?: number, visualContrast?: number, visualVignette?: number, godRaysEnabled?: boolean, godRayStrength?: number, chromaticAberration?: number, autoFocus?: boolean, ambientOcclusion?: boolean, outlineEdges?: boolean, pbrMaterials?: boolean }) => {
    isRealistic = params.realisticMode
    isPbrEnabled = params.pbrMaterials !== false
    cloudMat.uniforms.cloudDensity.value = params.cloudDensity
    currentCloudSpeed = params.cloudSpeed
    cloudsDome.visible = params.cloudDensity > 0
    
    if (cloudShadowPass) {
      cloudShadowPass.enabled = params.realisticMode && params.cloudDensity > 0 && params.cloudShadowsEnabled !== false
      cloudShadowPass.uniforms.cloudDensity.value = params.cloudDensity
    }
    
    if (bokehPass) {
      bokehPass.enabled = params.dofEnabled
      if (!autoFocusEnabled && params.dofFocus !== undefined) bokehPass.uniforms['focus'].value = params.dofFocus
      if (params.dofAperture !== undefined) bokehPass.uniforms['aperture'].value = params.dofAperture
      if (params.dofMaxBlur !== undefined) bokehPass.uniforms['maxblur'].value = params.dofMaxBlur
    }
    
    if (params.autoFocus !== undefined) {
      autoFocusEnabled = params.autoFocus
    }
    
    if (ssaoPass) {
      ssaoPass.enabled = params.realisticMode && params.ambientOcclusion !== false
    }
    
    if (edgePass) {
      edgePass.enabled = params.realisticMode && params.outlineEdges !== false
    }
    
    if (ssrPass) {
      ssrPass.enabled = false // Disabled for now as it turns all ground into a mirror without selective meshes
    }
    
    if (godRayPass) {
      godRayPass.enabled = params.realisticMode && params.godRaysEnabled === true
      if (params.godRayStrength !== undefined) godRayPass.uniforms.godRayStrength.value = params.godRayStrength
    }
    
    if (colorGradePass) {
      colorGradePass.enabled = params.realisticMode
      if (params.visualSaturation !== undefined) colorGradePass.uniforms.saturation.value = params.visualSaturation
      if (params.visualTemperature !== undefined) colorGradePass.uniforms.temperature.value = params.visualTemperature
      if (params.visualContrast !== undefined) colorGradePass.uniforms.contrast.value = params.visualContrast
      if (params.visualVignette !== undefined) colorGradePass.uniforms.vignette.value = params.visualVignette
      if (params.chromaticAberration !== undefined) colorGradePass.uniforms.chromaticAberration.value = params.chromaticAberration
    }

    if (params.realisticMode) {
      // Upgrade Lambert materials to Standard for PBR reflections
      world.scene.three.traverse((child: any) => {
        if (child.isMesh) {
          let isInvisible = false;
          if (child.material) {
            const checkMat = (m: any) => m.transparent && (m.opacity < 0.05 || m.colorWrite === false)
            if (Array.isArray(child.material)) {
               isInvisible = child.material.length > 0 && child.material.every(checkMat)
            } else {
               isInvisible = checkMat(child.material)
            }
          }

          if (isInvisible) {
             child.castShadow = false;
             child.receiveShadow = false;
             child.visible = false;
             return;
          }

          child.castShadow = true
          child.receiveShadow = true
          
          if (child.material) {
            let mapping: any = null;
            for (const [modelId, model] of fragments.models.list.entries()) {
               const map = (model as any).userData?.pbrMaterialMap;
               if (map) {
                  if (map.has(child.uuid)) mapping = map.get(child.uuid);
                  else if (map.has(child.id?.toString())) mapping = map.get(child.id?.toString());
               }
               if (mapping) break;
            }

            const convert = (mat: any) => {
              // Revert to original material if PBR is disabled
              if (!isPbrEnabled) {
                 if (mat.userData.isUpgraded && mat.userData.originalMaterial) {
                     return mat.userData.originalMaterial;
                 }
                 return mat;
              }
              
              if ((mat.isMeshLambertMaterial || mat.isMeshBasicMaterial || mat.isMeshPhongMaterial) && !mat.userData.isUpgraded) {
                let newMat;
                if (mapping) {
                  if (mapping.isPhysical) {
                    newMat = new THREE.MeshPhysicalMaterial({
                      color: mapping.color,
                      roughness: mapping.roughness,
                      metalness: mapping.metalness,
                      transmission: mapping.transmission || 0,
                      transparent: mapping.transparent || false,
                      opacity: mapping.opacity !== undefined ? mapping.opacity : 1.0,
                      side: mat.side,
                      map: mat.map || null
                    });
                  } else {
                    newMat = new THREE.MeshStandardMaterial({
                      color: mapping.color,
                      roughness: mapping.roughness,
                      metalness: mapping.metalness,
                      side: mat.side,
                      transparent: mat.transparent || (mapping.opacity !== undefined && mapping.opacity < 1.0),
                      opacity: mapping.opacity !== undefined ? mapping.opacity : (mat.opacity || 1.0),
                      map: mat.map || null
                    });
                  }
                } else {
                  newMat = new THREE.MeshStandardMaterial({
                    color: mat.color,
                    roughness: 0.8,
                    metalness: 0.1,
                    side: mat.side,
                    transparent: mat.transparent,
                    opacity: mat.opacity,
                    map: mat.map || null
                  })
                }
                newMat.userData.isUpgraded = true
                newMat.userData.originalMaterial = mat

                return newMat
              }
              return mat
            }
            if (Array.isArray(child.material)) {
              child.material = child.material.map(convert)
            } else {
              child.material = convert(child.material)
            }
          }
        }
      })
      // Calculate sun position for Dubai (Lat: 25.2048, Lon: 55.2708)
      // We force the UTC date to be (timeOfDay - 4 hours) so the slider acts as Dubai Local Time (UTC+4)
      const now = new Date()
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(params.timeOfDay) - 4, (params.timeOfDay % 1) * 60, 0))
      
      const sunPos = SunCalc.getPosition(date, 25.2048, 55.2708)
      
      // Convert SunCalc degrees back to radians
      const altitudeRad = sunPos.altitude * Math.PI / 180
      const azimuthRad = sunPos.azimuth * Math.PI / 180

      const phi = Math.PI / 2 - altitudeRad
      const theta = azimuthRad + Math.PI / 2
      
      // Ensure sky does not receive shadows (prevents giant black blobs in the sky)
      if (sky) {
        sky.receiveShadow = false
        sky.castShadow = false
      }
      if (cloudsDome) {
        cloudsDome.receiveShadow = false
        cloudsDome.castShadow = false
      }
      
      const sunPosition = new THREE.Vector3()
      sunPosition.setFromSphericalCoords(10000, phi, theta)
      sky.material.uniforms['sunPosition'].value.copy(sunPosition)
      
      // We don't set rDir position here because we will update it in the render loop to follow the camera
      rDir.userData.sunOffset = sunPosition.clone()
      
      cloudMat.uniforms.sunPosition.value.copy(sunPosition)

      world.renderer.three.shadowMap.enabled = true
      world.renderer.three.shadowMap.type = THREE.PCFShadowMap
      world.renderer.three.shadowMap.autoUpdate = true
      world.renderer.three.toneMapping = THREE.ACESFilmicToneMapping
      world.renderer.three.toneMappingExposure = params.exposure
      world.scene.three.environment = envTexture
      
      // Add Atmospheric Fog (matches the hazy horizon)
      world.scene.three.fog = new THREE.FogExp2(0x88aacc, params.fogDensity)

      if (bloomPass) {
        bloomPass.enabled = params.bloomEnabled !== false
        bloomPass.strength = params.bloomStrength
        bloomPass.threshold = params.bloomThreshold
      }
      
      realisticGroup.visible = true
      rDir.intensity = params.lightIntensity
      rAmbient.intensity = params.ambientIntensity

      // Add directional light target to scene so it updates correctly
      if (rDir.target.parent !== world.scene.three) {
        world.scene.three.add(rDir.target)
      }

      world.scene.three.traverse((child: any) => {
        if ((child.isDirectionalLight || child.isAmbientLight) && child.parent !== realisticGroup) {
          child.visible = false
        }
      })
    } else {
      world.renderer.three.shadowMap.enabled = false
      world.renderer.three.toneMapping = THREE.NoToneMapping
      world.renderer.three.toneMappingExposure = 1.0
      world.scene.three.environment = null
      world.scene.three.fog = null
      
      if (bloomPass) bloomPass.enabled = false
      if (godRayPass) godRayPass.enabled = false
      if (edgePass) edgePass.enabled = false
      
      realisticGroup.visible = false

      world.scene.three.traverse((child: any) => {
        if ((child.isDirectionalLight || child.isAmbientLight) && child.parent !== realisticGroup) {
          child.visible = true
        }
      })
    }

    world.scene.three.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.needsUpdate = true
      }
    })
  }

  setLightingParams({ realisticMode: false, exposure: 0.85, lightIntensity: 1.2, ambientIntensity: 0.3, timeOfDay: 14.5, bloomStrength: 0.15, bloomThreshold: 1.5, fogDensity: 0.00015, cloudDensity: 0.5, cloudSpeed: 1.0, dofEnabled: false, dofFocus: 2000.0, dofAperture: 0.0001, dofMaxBlur: 0.01, ambientOcclusion: false, outlineEdges: false, pbrMaterials: true })

  world.camera = new OBC.SimpleCamera(components)

  if (world.camera.three instanceof THREE.PerspectiveCamera || world.camera.three instanceof THREE.OrthographicCamera) {
    world.camera.three.near = 0.1
    world.camera.three.far = 200000
    world.camera.three.updateProjectionMatrix()
  }

  if (world.camera.controls) {
    world.camera.controls.maxDistance = Infinity
    world.camera.controls.minDistance = 0.1
    world.camera.controls.dollySpeed = 2
    world.camera.controls.truckSpeed = 2
    world.camera.controls.infinityDolly = true
    world.camera.controls.dollyToCursor = true
  }

  world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0)

  // Postprocessing (SMAA)
  const composer = new EffectComposer(world.renderer.three)
  
  composer.renderTarget1.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight)
  composer.renderTarget1.depthBuffer = true
  composer.renderTarget2.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight)
  composer.renderTarget2.depthBuffer = true
  
  const renderPass = new RenderPass(world.scene.three, world.camera.three)
  composer.addPass(renderPass)

  // Ambient Occlusion (N8AO) - MUST be immediately after RenderPass to avoid overwriting other effects
  ssaoPass = new N8AOPass(world.scene.three, world.camera.three, window.innerWidth, window.innerHeight)
  ssaoPass.configuration.aoRadius = 50.0 // Increased to 50 to account for millimeter scale models
  ssaoPass.configuration.intensity = 5.0
  ssaoPass.configuration.aoSamples = 16
  ssaoPass.configuration.denoiseSamples = 4
  ssaoPass.configuration.denoiseRadius = 12
  ssaoPass.configuration.distanceFalloff = 1.0
  ssaoPass.configuration.halfRes = false // Disabled halfRes to fix ANGLE washout bug on Windows
  // @ts-ignore - explicitly disable double gamma correction if the property exists
  if (ssaoPass.configuration.gammaCorrection !== undefined) ssaoPass.configuration.gammaCorrection = false
  ssaoPass.enabled = false
  composer.addPass(ssaoPass)

  // Bloom Pass
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,  // strength
    0.4,   // radius
    1.5    // threshold
  )
  bloomPass.enabled = false
  composer.addPass(bloomPass)

  // Cloud Shadow Post-Processing Pass
  cloudShadowPass = new ShaderPass(CloudShadowShader)
  cloudShadowPass.enabled = false
  composer.addPass(cloudShadowPass)

  ssrPass = new SSRPass({
    renderer: world.renderer.three,
    scene: world.scene.three,
    camera: world.camera.three,
    width: window.innerWidth,
    height: window.innerHeight,
    groundReflector: null,
    selects: null
  })
  ssrPass.enabled = false
  ssrPass.maxDistance = 10000
  ssrPass.opacity = 0.8
  ssrPass.thickness = 100
  composer.addPass(ssrPass)

  // God Rays
  godRayPass = new ShaderPass(GodRayShader)
  godRayPass.enabled = false

  // Unified Scene Depth RT for post-processing
  const sceneDepthW = window.innerWidth
  const sceneDepthH = window.innerHeight
  sceneDepthRT = new THREE.WebGLRenderTarget(sceneDepthW, sceneDepthH)
  sceneDepthRT.depthBuffer = true
  sceneDepthRT.depthTexture = new THREE.DepthTexture(sceneDepthW, sceneDepthH)
  sceneDepthRT.depthTexture.format = THREE.DepthFormat
  sceneDepthRT.depthTexture.type = THREE.UnsignedIntType // Upgraded to 32-bit to fix grazing angle pixelation
  
  godRayPass.uniforms.tDepth.value = sceneDepthRT.depthTexture
  composer.addPass(godRayPass)

  colorGradePass = new ShaderPass(ColorGradeShader)
  colorGradePass.enabled = false
  composer.addPass(colorGradePass)
  
  // Custom Edge Outline Pass
  edgePass = new ShaderPass(CustomEdgeShader)
  edgePass.enabled = false
  edgePass.uniforms.tDepth.value = sceneDepthRT.depthTexture
  edgePass.uniforms.resolution.value.set(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
  composer.addPass(edgePass)

  // SMAA Pass
  const smaaPass = new SMAAPass()
  smaaPass.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
  composer.addPass(smaaPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  
  bokehPass = new BokehPass(world.scene.three, world.camera.three, {
    focus: 2000.0,
    aperture: 0.0001,
    maxblur: 0.01
  })
  bokehPass.enabled = false
  composer.addPass(bokehPass)

  const clock = new THREE.Clock()
  const defaultUpdate = world.renderer.update.bind(world.renderer)
  world.renderer.update = () => {
    const delta = clock.getDelta()
    if (isRealistic) {
      if (!world.renderer.enabled || !world.renderer.currentWorld) return
      
      cloudMat.uniforms.time.value += delta * currentCloudSpeed
      
      if (cloudShadowPass && cloudShadowPass.enabled) {
        cloudShadowPass.uniforms.tDepth.value = sceneDepthRT.depthTexture
        cloudShadowPass.uniforms.time.value = cloudMat.uniforms.time.value
        cloudShadowPass.uniforms.sunPosition.value = cloudMat.uniforms.sunPosition.value
        cloudShadowPass.uniforms.cameraNear.value = world.camera.three.near
        cloudShadowPass.uniforms.cameraFar.value = world.camera.three.far
        cloudShadowPass.uniforms.projectionMatrixInverse.value.copy(world.camera.three.projectionMatrixInverse)
        cloudShadowPass.uniforms.viewMatrixInverse.value.copy(world.camera.three.matrixWorld)
      }
      
      if (godRayPass && godRayPass.enabled && rDir.userData.sunOffset) {
        const sunWorld = new THREE.Vector3().copy(rDir.userData.sunOffset).normalize().multiplyScalar(1000)
        const sunClip  = sunWorld.clone().project(world.camera.three)
        godRayPass.uniforms.sunPositionScreen.value.set(
          (sunClip.x + 1) * 0.5,
          (sunClip.y + 1) * 0.5
        )
        const sunDir = new THREE.Vector3().copy(rDir.userData.sunOffset).normalize()
        godRayPass.uniforms.sunElevation.value = sunDir.y
      }
      
      if (edgePass && edgePass.enabled) {
         edgePass.uniforms.cameraNear.value = world.camera.three.near
         edgePass.uniforms.cameraFar.value = world.camera.three.far
      }
      
      // Auto-focus
      if (autoFocusEnabled && bokehPass && bokehPass.enabled && world.camera.controls) {
        const focusTarget = new THREE.Vector3()
        world.camera.controls.getTarget(focusTarget)
        const dist = world.camera.three.position.distanceTo(focusTarget)
        bokehPass.uniforms['focus'].value = THREE.MathUtils.lerp(
          bokehPass.uniforms['focus'].value as number,
          dist,
          Math.min(delta * 3.0, 1.0)
        )
      }
      
      if (rDir.userData.sunOffset && world.camera.controls) {
        const target = new THREE.Vector3()
        world.camera.controls.getTarget(target)
        rDir.target.position.copy(target)
        rDir.position.copy(target).add(rDir.userData.sunOffset)
        rDir.shadow.camera.updateProjectionMatrix()
      }
      
      // Unified Scene Depth pre-pass for post-processing effects
      const needsDepth = (godRayPass && godRayPass.enabled) || (edgePass && edgePass.enabled) || (cloudShadowPass && cloudShadowPass.enabled)
      if (needsDepth) {
        const skyVisible = sky.visible
        const cloudsVisible = cloudsDome.visible
        sky.visible = false
        cloudsDome.visible = false

        // Hide transparent/invisible proxy meshes (like collision boxes) so they don't get outlined or receive shadows
        const hiddenMeshes: THREE.Mesh[] = []
        world.scene.three.traverse((child: any) => {
          if (child.isMesh && child.visible && child.material) {
            let isInvisible = false
            const checkMat = (m: any) => {
              if (m.transparent && m.opacity < 0.05) return true
              if (m.colorWrite === false) return true
              return false
            }
            if (Array.isArray(child.material)) {
              isInvisible = child.material.length > 0 && child.material.every(checkMat)
            } else {
              isInvisible = checkMat(child.material)
            }
            if (isInvisible) {
              child.visible = false
              hiddenMeshes.push(child)
            }
          }
        })

        world.scene.three.overrideMaterial = new THREE.MeshDepthMaterial()
        world.renderer.three.setRenderTarget(sceneDepthRT)
        world.renderer.three.clear()
        world.renderer.three.render(world.scene.three, world.camera.three)
        world.renderer.three.setRenderTarget(null)
        world.scene.three.overrideMaterial = null

        sky.visible = skyVisible
        cloudsDome.visible = cloudsVisible
        hiddenMeshes.forEach(m => { m.visible = true })
      }

      world.renderer.needsUpdate = false
      world.renderer.onBeforeUpdate.trigger(world.renderer)
      composer.render()
      world.renderer.onAfterUpdate.trigger(world.renderer)
    } else {
      defaultUpdate()
    }
  }

  world.renderer.onResize.add((size: THREE.Vector2) => {
    if (world.camera.three instanceof THREE.PerspectiveCamera) {
      world.camera.three.aspect = size.x / size.y
      world.camera.three.updateProjectionMatrix()
    }
    composer.setSize(size.x, size.y)
    smaaPass.setSize(size.x * window.devicePixelRatio, size.y * window.devicePixelRatio)
    if (ssaoPass && typeof ssaoPass.setSize === 'function') ssaoPass.setSize(size.x, size.y)
    if (bloomPass) bloomPass.setSize(size.x, size.y)
    if (edgePass) edgePass.uniforms.resolution.value.set(size.x * window.devicePixelRatio, size.y * window.devicePixelRatio)
    if (sceneDepthRT) sceneDepthRT.setSize(size.x, size.y)
  })

  components.init()


  const grids = components.get(OBC.Grids)
  const grid = grids.create(world)
  grid.visible = false

  const workerUrl = await FRAGS.FragmentsModels.getWorker()
  const fragments = new FRAGS.FragmentsModels(workerUrl)

  const obcFragments = components.get(OBC.FragmentsManager)
  obcFragments.init(workerUrl)

  world.camera.controls.addEventListener('update', () => fragments.update())

  fragments.models.materials.list.onItemSet.add(({ value: material }: any) => {
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true
      material.polygonOffsetUnits = 1
      material.polygonOffsetFactor = Math.random()
    }
  })
  
  fragments.models.list.onItemSet.add(async ({ value: model }: any) => {
    if (isRealistic) {
      model.traverse?.((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }
    
    // Async compute PBR mapping
    model.userData = model.userData || {};
    model.userData.pbrMaterialMap = new Map<string, any>();
    
    if (typeof model.getCategories === 'function' && typeof model.getItemsByQuery === 'function') {
      setTimeout(async () => {
        try {
          const categories = await model.getCategories();
          for (const mapping of PBR_MATERIAL_MAPPINGS) {
            const matchingCats = categories.filter((c: string) => c.match(mapping.category));
            if (matchingCats.length > 0) {
              const regexCats = matchingCats.map((c: string) => new RegExp(`^${c}$`));
              const items = await model.getItemsByQuery({ categories: regexCats });
              if (items && items.length > 0 && typeof model.getFragmentMap === 'function') {
                const fragMap = model.getFragmentMap(items);
                for (const fragId in fragMap) {
                   if (!model.userData.pbrMaterialMap.has(fragId)) {
                     model.userData.pbrMaterialMap.set(fragId, mapping);
                   }
                }
              }
            }
          }
          
          if (isRealistic) {
             model.traverse?.((child: any) => {
                if (child.isMesh && child.material) {
                    const map = model.userData.pbrMaterialMap;
                    let mapping: any = null;
                    if (map.has(child.uuid)) mapping = map.get(child.uuid);
                    else if (map.has(child.id?.toString())) mapping = map.get(child.id?.toString());
                    
                    const convert = (mat: any) => {
                       if (!isPbrEnabled) {
                          if (mat.userData.isUpgraded && mat.userData.originalMaterial) return mat.userData.originalMaterial;
                          return mat;
                       }
                       
                       if ((mat.isMeshLambertMaterial || mat.isMeshBasicMaterial || mat.isMeshPhongMaterial) && !mat.userData.isUpgraded) {
                          let newMat;
                          if (mapping) {
                            if (mapping.isPhysical) {
                              newMat = new THREE.MeshPhysicalMaterial({
                                color: mapping.color,
                                roughness: mapping.roughness,
                                metalness: mapping.metalness,
                                transmission: mapping.transmission || 0,
                                transparent: mapping.transparent || false,
                                opacity: mapping.opacity !== undefined ? mapping.opacity : 1.0,
                                side: mat.side,
                                map: mat.map || null
                              });
                            } else {
                              newMat = new THREE.MeshStandardMaterial({
                                color: mapping.color,
                                roughness: mapping.roughness,
                                metalness: mapping.metalness,
                                side: mat.side,
                                transparent: mat.transparent || (mapping.opacity !== undefined && mapping.opacity < 1.0),
                                opacity: mapping.opacity !== undefined ? mapping.opacity : (mat.opacity || 1.0),
                                map: mat.map || null
                              });
                            }
                          } else {
                            newMat = new THREE.MeshStandardMaterial({
                              color: mat.color,
                              roughness: 0.8,
                              metalness: 0.1,
                              side: mat.side,
                              transparent: mat.transparent,
                              opacity: mat.opacity,
                              map: mat.map || null
                            });
                          }
                          newMat.userData.isUpgraded = true;
                          newMat.userData.originalMaterial = mat;
                          return newMat;
                       }
                       return mat;
                    };
                    if (Array.isArray(child.material)) child.material = child.material.map(convert);
                    else child.material = convert(child.material);
                }
             });
          }
        } catch (err: any) {
          if (!err.message?.includes('Model not found')) {
            console.warn('Could not compute PBR map for model', err);
          }
        }
      }, 2000) // 2s delay allows worker to fully initialize the model first
    }
  })

  const dispose = async () => {
    const ids = [...fragments.models.list.values()].map((m: any) => m.modelId)
    await Promise.all(ids.map((id: string) => fragments.disposeModel(id)))
    components.dispose()
  }

  return { fragments, obcFragments, world, components, dispose, setLightingParams }
}
