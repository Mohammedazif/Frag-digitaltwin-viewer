import * as THREE from 'three'

export const CustomEdgeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2() },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 200000 },
    edgeColor: { value: new THREE.Color(0x222222) },
    edgeOpacity: { value: 0.3 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    #include <packing>
    
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 edgeColor;
    uniform float edgeOpacity;

    varying vec2 vUv;

    float readDepth(vec2 coord) {
      float fragCoordZ = texture2D(tDepth, coord).x;
      float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      
      vec2 texelSize = 1.0 / resolution;
      
      // Sobel operator on depth
      float d00 = readDepth(vUv + vec2(-texelSize.x, -texelSize.y));
      float d01 = readDepth(vUv + vec2(-texelSize.x, 0.0));
      float d02 = readDepth(vUv + vec2(-texelSize.x, texelSize.y));
      
      float d10 = readDepth(vUv + vec2(0.0, -texelSize.y));
      float d12 = readDepth(vUv + vec2(0.0, texelSize.y));
      
      float d20 = readDepth(vUv + vec2(texelSize.x, -texelSize.y));
      float d21 = readDepth(vUv + vec2(texelSize.x, 0.0));
      float d22 = readDepth(vUv + vec2(texelSize.x, texelSize.y));
      
      float gx = d00 + 2.0 * d01 + d02 - d20 - 2.0 * d21 - d22;
      float gy = d00 + 2.0 * d10 + d20 - d02 - 2.0 * d12 - d22;
      
      float edge = sqrt(gx * gx + gy * gy);
      
      // Threshold and scale - significantly increased to ignore sloped surfaces and only catch true silhouettes
      edge = smoothstep(0.002, 0.01, edge);
      
      vec3 finalColor = mix(texel.rgb, edgeColor, edge * edgeOpacity);
      gl_FragColor = vec4(finalColor, texel.a);
    }
  `
}
