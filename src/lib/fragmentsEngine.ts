import * as FRAGS from '@thatopen/fragments'
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
import * as SunCalc from 'suncalc'

export interface FragmentsEngine {
  fragments: FRAGS.FragmentsModels
  world: any
  components: OBC.Components
  dispose: () => Promise<void>
  setLightingParams: (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, fogDensity: number }) => void
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
  const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture
  envScene.dispose()

  // Custom Realistic Lights & Environment
  const realisticGroup = new THREE.Group()
  
  // Sky - scaled massively so the camera never leaves the box
  const sky = new Sky()
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
  
  // Increase map size for better resolution over large area
  rDir.shadow.mapSize.width = 4096
  rDir.shadow.mapSize.height = 4096
  rDir.shadow.camera.near = 10
  rDir.shadow.camera.far = 10000
  rDir.shadow.camera.left = -2000
  rDir.shadow.camera.right = 2000
  rDir.shadow.camera.top = 2000
  rDir.shadow.camera.bottom = -2000
  rDir.shadow.bias = -0.005
  rDir.shadow.normalBias = 0.1
  
  realisticGroup.add(sky, rAmbient, rDir)
  world.scene.three.add(realisticGroup)

  let isRealistic = false
  let bloomPass: UnrealBloomPass
  const setLightingParams = (params: { realisticMode: boolean, exposure: number, lightIntensity: number, ambientIntensity: number, timeOfDay: number, bloomStrength: number, bloomThreshold: number, fogDensity: number }) => {
    isRealistic = params.realisticMode

    if (params.realisticMode) {
      // Upgrade Lambert materials to Standard for PBR reflections
      world.scene.three.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const convert = (mat: any) => {
            if (mat.isMeshLambertMaterial && !mat.userData.isUpgraded) {
              const newMat = new THREE.MeshStandardMaterial({
                color: mat.color,
                roughness: 0.8,
                metalness: 0.1,
                side: mat.side,
                transparent: mat.transparent,
                opacity: mat.opacity
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
      
      const sunPosition = new THREE.Vector3()
      sunPosition.setFromSphericalCoords(1000, phi, theta)
      sky.material.uniforms['sunPosition'].value.copy(sunPosition)
      rDir.position.copy(sunPosition)

      world.renderer.three.shadowMap.enabled = true
      world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap
      world.renderer.three.toneMapping = THREE.ACESFilmicToneMapping
      world.renderer.three.toneMappingExposure = params.exposure
      world.scene.three.environment = envTexture
      
      // Add Atmospheric Fog (matches the hazy horizon)
      world.scene.three.fog = new THREE.FogExp2(0x88aacc, params.fogDensity)

      if (bloomPass) {
        bloomPass.strength = params.bloomStrength
        bloomPass.threshold = params.bloomThreshold
      }
      
      realisticGroup.visible = true
      rDir.intensity = params.lightIntensity
      rAmbient.intensity = params.ambientIntensity

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

  setLightingParams({ realisticMode: false, exposure: 0.85, lightIntensity: 1.2, ambientIntensity: 0.3, timeOfDay: 14.5, bloomStrength: 0.15, bloomThreshold: 1.5, fogDensity: 0.00015 })

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
    world.camera.controls.infinityDolly = true
    world.camera.controls.dollyToCursor = true
  }

  world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0)

  // Postprocessing (SMAA only, Bloom disabled to prevent white blowouts on close surfaces)
  const composer = new EffectComposer(world.renderer.three)
  const renderPass = new RenderPass(world.scene.three, world.camera.three)
  composer.addPass(renderPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  const smaaPass = new SMAAPass()
  smaaPass.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
  composer.addPass(smaaPass)

  const defaultUpdate = world.renderer.update.bind(world.renderer)
  world.renderer.update = () => {
    if (isRealistic) {
      if (!world.renderer.enabled || !world.renderer.currentWorld) return
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
  })

  components.init()

  const grids = components.get(OBC.Grids)
  const grid = grids.create(world)
  grid.visible = false

  const workerUrl = await FRAGS.FragmentsModels.getWorker()
  const fragments = new FRAGS.FragmentsModels(workerUrl)

  world.camera.controls.addEventListener('update', () => fragments.update())

  fragments.models.materials.list.onItemSet.add(({ value: material }: any) => {
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true
      material.polygonOffsetUnits = 1
      material.polygonOffsetFactor = Math.random()
    }
  })

  const dispose = async () => {
    const ids = [...fragments.models.list.values()].map((m: any) => m.modelId)
    await Promise.all(ids.map((id: string) => fragments.disposeModel(id)))
    components.dispose()
  }

  return { fragments, world, components, dispose, setLightingParams }
}
