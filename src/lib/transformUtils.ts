import * as THREE from 'three'

export function applyModelTransform(
  object: THREE.Object3D,
  transform: { position?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number] }
) {
  const { originalPosition, originalRotation, originalScale } = object.userData

  if (!originalPosition || !originalRotation || !originalScale) return

  const pos = transform.position || [0, 0, 0]
  const rot = transform.rotation || [0, 0, 0]
  const scl = transform.scale || [1, 1, 1]

  const posVec = new THREE.Vector3(pos[0], pos[1], pos[2])
  const rotEuler = new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ')
  const sclVec = new THREE.Vector3(scl[0], scl[1], scl[2])

  const m_orig = new THREE.Matrix4().compose(
    originalPosition,
    new THREE.Quaternion().setFromEuler(originalRotation),
    originalScale
  )

  const m_user = new THREE.Matrix4().compose(
    posVec,
    new THREE.Quaternion().setFromEuler(rotEuler),
    sclVec
  )

  const m_final = new THREE.Matrix4().multiplyMatrices(m_user, m_orig)

  m_final.decompose(object.position, object.quaternion, object.scale)
}
