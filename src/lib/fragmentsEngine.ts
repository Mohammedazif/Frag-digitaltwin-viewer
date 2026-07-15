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
import * as SunCalc from 'suncalc'

export interface FragmentsEngine {
  fragments: FRAGS.FragmentsModels
  obcFragments: OBC.FragmentsManager
  world: any
  components: OBC.Components
  dispose: () => Promise<void>
  setLightingParams: (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, bloomEnabled?: boolean, fogDensity: number, cloudDensity: number, cloudShadowsEnabled?: boolean, cloudSpeed: number, dofEnabled: boolean, dofFocus: number, dofAperture: number, dofMaxBlur: number, visualSaturation?: number, visualTemperature?: number, visualContrast?: number, visualVignette?: number, godRaysEnabled?: boolean, godRayStrength?: number, chromaticAberration?: number, autoFocus?: boolean }) => void
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

  // Custom Realistic Lights & Environment
  const realisticGroup = new THREE.Group()
  
  // Sky - scaled massively so the camera never leaves the box
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
  
  // Keep map size high but tighten the frustum for crisp shadows
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
  rDir.shadow.camera.layers.enable(11) // Enable shadow camera to see the invisible shadow gobo

  // Clouds (Procedural Shader Dome)
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
  let godRayDepthRT: THREE.WebGLRenderTarget
  let autoFocusEnabled = false

  const setLightingParams = (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, bloomEnabled?: boolean, fogDensity: number, cloudDensity: number, cloudShadowsEnabled?: boolean, cloudSpeed: number, dofEnabled: boolean, dofFocus: number, dofAperture: number, dofMaxBlur: number, visualSaturation?: number, visualTemperature?: number, visualContrast?: number, visualVignette?: number, godRaysEnabled?: boolean, godRayStrength?: number, chromaticAberration?: number, autoFocus?: boolean }) => {
    isRealistic = params.realisticMode
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
      ssaoPass.enabled = params.realisticMode
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
          child.castShadow = true
          child.receiveShadow = true
          
          if (child.material) {
            const convert = (mat: any) => {
            if ((mat.isMeshLambertMaterial || mat.isMeshBasicMaterial || mat.isMeshPhongMaterial) && !mat.userData.isUpgraded) {
              const newMat = new THREE.MeshStandardMaterial({
                color: mat.color,
                roughness: 0.8,
                metalness: 0.1,
                side: mat.side,
                transparent: mat.transparent,
                opacity: mat.opacity,
                map: mat.map || null
              })
              newMat.userData.isUpgraded = true

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
      world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap
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

  setLightingParams({ realisticMode: false, exposure: 0.85, lightIntensity: 1.2, ambientIntensity: 0.3, timeOfDay: 14.5, bloomStrength: 0.15, bloomThreshold: 1.5, fogDensity: 0.00015, cloudDensity: 0.5, cloudSpeed: 1.0, dofEnabled: false, dofFocus: 2000.0, dofAperture: 0.0001, dofMaxBlur: 0.01 })

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

  // Postprocessing (SMAA only, Bloom disabled to prevent white blowouts on close surfaces)
  const composer = new EffectComposer(world.renderer.three)
  
  // Create a depth texture for BOTH render targets so post-processing passes can read world depth on every frame
  // (EffectComposer alternates between renderTarget1 and renderTarget2, so both must have depth attached!)
  composer.renderTarget1.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight)
  composer.renderTarget1.depthBuffer = true
  composer.renderTarget2.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight)
  composer.renderTarget2.depthBuffer = true
  
  const renderPass = new RenderPass(world.scene.three, world.camera.three)
  composer.addPass(renderPass)

  // Bloom Pass — now properly instantiated (was declared but never created)
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,  // strength  (controlled by slider)
    0.4,   // radius    (spread of the glow)
    1.5    // threshold (only pixels brighter than this bloom — keeps sky/walls clean)
  )
  bloomPass.enabled = false
  composer.addPass(bloomPass)

  // Cloud Shadow Post-Processing Pass
  cloudShadowPass = new ShaderPass(CloudShadowShader)
  cloudShadowPass.enabled = false
  composer.addPass(cloudShadowPass)

  ssaoPass = new SSAOPass(world.scene.three, world.camera.three, window.innerWidth, window.innerHeight)
  ssaoPass.kernelRadius = 16
  ssaoPass.minDistance = 0.001
  ssaoPass.maxDistance = 0.1
  ssaoPass.enabled = false
  composer.addPass(ssaoPass)

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

  // God Rays — Volumetric Light Scattering (depth-occlusion from sun position)
  godRayPass = new ShaderPass(GodRayShader)
  godRayPass.enabled = false
  //
  // IMPORTANT: Do NOT use composer.renderTarget1/2.depthTexture here.
  // EffectComposer alternates renderTarget1 ⇔ renderTarget2 as write buffer each pass.
  // If godRayPass samples renderTargetX.depthTexture while that target IS the active
  // framebuffer (write buffer), WebGL throws:
  //   GL_INVALID_OPERATION: Feedback loop formed between Framebuffer and active Texture
  // Solution: use a completely SEPARATE render target that EffectComposer never writes to.
  //
  const godRayW = Math.ceil(window.innerWidth  * 0.5)  // half-res → fast depth pre-pass
  const godRayH = Math.ceil(window.innerHeight * 0.5)
  godRayDepthRT = new THREE.WebGLRenderTarget(godRayW, godRayH)
  godRayDepthRT.depthBuffer = true
  godRayDepthRT.depthTexture = new THREE.DepthTexture(godRayW, godRayH)
  godRayDepthRT.depthTexture.format = THREE.DepthFormat
  godRayDepthRT.depthTexture.type = THREE.UnsignedShortType
  godRayPass.uniforms.tDepth.value = godRayDepthRT.depthTexture  // safe — never a framebuffer
  composer.addPass(godRayPass)

  colorGradePass = new ShaderPass(ColorGradeShader)
  colorGradePass.enabled = false
  composer.addPass(colorGradePass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  const smaaPass = new SMAAPass()
  smaaPass.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
  composer.addPass(smaaPass)
  
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
        // Read depth from the currently active read buffer to prevent flickering
        cloudShadowPass.uniforms.tDepth.value = composer.readBuffer.depthTexture
        cloudShadowPass.uniforms.time.value = cloudMat.uniforms.time.value
        cloudShadowPass.uniforms.sunPosition.value = cloudMat.uniforms.sunPosition.value
        cloudShadowPass.uniforms.cameraNear.value = world.camera.three.near
        cloudShadowPass.uniforms.cameraFar.value = world.camera.three.far
        cloudShadowPass.uniforms.projectionMatrixInverse.value.copy(world.camera.three.projectionMatrixInverse)
        cloudShadowPass.uniforms.viewMatrixInverse.value.copy(world.camera.three.matrixWorld)
      }
      
      // Update sun screen-space position for god rays every frame
      // (tDepth is permanently bound to godRayDepthRT, updated via the pre-pass below)
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
      
      // Auto-focus: drive BokehPass focus toward orbit controls target distance
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
      
      // God ray depth pre-pass — render to DEDICATED half-res render target.
      // Uses MeshDepthMaterial (no lighting/PBR → very fast). Sky sphere is
      // beyond far plane (radius 500k > far 200k) → clipped → sky pixels keep
      // clear depth = 1.0, which is what the shader uses to detect sky.
      if (godRayPass && godRayPass.enabled) {
        world.scene.three.overrideMaterial = new THREE.MeshDepthMaterial()
        world.renderer.three.setRenderTarget(godRayDepthRT)
        world.renderer.three.clear()
        world.renderer.three.render(world.scene.three, world.camera.three)
        world.renderer.three.setRenderTarget(null)
        world.scene.three.overrideMaterial = null
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
    if (ssaoPass) ssaoPass.setSize(size.x, size.y)
    if (bloomPass) bloomPass.setSize(size.x, size.y)
    if (godRayDepthRT) godRayDepthRT.setSize(Math.ceil(size.x * 0.5), Math.ceil(size.y * 0.5))
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
  
  fragments.models.list.onItemSet.add(({ value: model }: any) => {
    if (isRealistic) {
      model.traverse?.((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }
  })

  const dispose = async () => {
    const ids = [...fragments.models.list.values()].map((m: any) => m.modelId)
    await Promise.all(ids.map((id: string) => fragments.disposeModel(id)))
    components.dispose()
  }

  return { fragments, obcFragments, world, components, dispose, setLightingParams }
}
