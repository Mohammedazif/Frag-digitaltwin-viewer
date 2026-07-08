import * as THREE from 'three'

export const CloudShadowShader = {
  uniforms: {
    'tDiffuse': { value: null as THREE.Texture | null },
    'tDepth': { value: null as THREE.DepthTexture | null },
    'cameraNear': { value: 0.1 },
    'cameraFar': { value: 200000.0 },
    'projectionMatrixInverse': { value: new THREE.Matrix4() },
    'viewMatrixInverse': { value: new THREE.Matrix4() },
    'time': { value: 0.0 },
    'cloudDensity': { value: 0.5 },
    'shadowStrength': { value: 0.35 },
    'sunPosition': { value: new THREE.Vector3(0, 1000, 0) },
    'enabled': { value: 1.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform mat4 projectionMatrixInverse;
    uniform mat4 viewMatrixInverse;
    uniform float time;
    uniform float cloudDensity;
    uniform float shadowStrength;
    uniform vec3 sunPosition;
    uniform float enabled;

    varying vec2 vUv;

    // ---- Identical noise functions to CloudShader.ts ----
    float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)),f.x),
                       mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)),f.x),
                       mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)),f.x),f.y),f.z);
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float tot = 0.0;
        float a = 0.5;
        for(int i = 0; i < 5; i++) {
            f += a * noise(p);
            tot += a;
            p *= 2.0;
            a *= 0.5;
        }
        return f / tot;
    }
    // ---- End noise functions ----

    vec3 getWorldPosition(vec2 uv, float depth) {
      // Convert UV + depth to clip space (-1 to 1)
      vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      
      // Clip space -> View space
      vec4 viewPos = projectionMatrixInverse * clipPos;
      viewPos /= viewPos.w;
      
      // View space -> World space
      vec4 worldPos = viewMatrixInverse * viewPos;
      return worldPos.xyz;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // If disabled, pass through
      if (enabled < 0.5) {
        gl_FragColor = color;
        return;
      }
      
      float depth = texture2D(tDepth, vUv).x;
      
      // Sky pixels have depth very close to 1.0 (far plane)
      // Skip them entirely — only darken actual geometry
      if (depth > 0.9999) {
        gl_FragColor = color;
        return;
      }
      
      // Reconstruct world position from depth
      vec3 worldPos = getWorldPosition(vUv, depth);
      
      // Project worldPos along the sun direction to a flat plane (y=0)
      // Lighting from the sun
      vec3 sunDir = normalize(sunPosition);
        
      // Day/night transition based on sun elevation
      float dayLight = smoothstep(-0.1, 0.1, sunDir.y);
      
      if (dayLight < 0.01) {
        gl_FragColor = color; // Sun is below horizon, no directional shadows!
        return;
      }
      
      // To perfectly align the shadows with the sky clouds, we must trace a ray from 
      // the ground pixel towards the sun, and find where it intersects the virtual 
      // cloud layer used by CloudShader.ts.
      // CloudShader uses a virtual plane projection: p = dir / dir.y
      // This means a point (X, H, Z) maps to p = (X/H, 1, Z/H).
      
      float H = 200.0; // Virtual cloud height (determines shadow scale)
      
      // Ray intersection with the virtual cloud plane at height H
      float sunY = max(sunDir.y, 0.05); // Cap to prevent infinite stretching at sunset
      
      vec3 intersectPos;
      intersectPos.x = worldPos.x + (H - worldPos.y) * (sunDir.x / sunY);
      intersectPos.z = worldPos.z + (H - worldPos.y) * (sunDir.z / sunY);
      
      // Map the intersection point to the exact same noise space used by CloudShader.ts
      // q = p * 4.0 = (X/H) * 4.0
      vec3 q = vec3(intersectPos.x / H, 0.0, intersectPos.z / H) * 4.0;
      
      // Animate IDENTICALLY to the sky dome clouds
      q += vec3(time * 0.5, 0.0, time * 0.3);
      
      float n = fbm(q);
      
      // Same density mapping as CloudShader.ts
      float coverage = (cloudDensity - 0.5) * 1.5;
      float c = smoothstep(0.4 - coverage, 0.7 - coverage, n);
      
      // Darken the pixel proportionally to cloud coverage and daylight
      // As dayLight approaches 0, the shadow disappears.
      float shadow = 1.0 - c * shadowStrength * dayLight;
      
      gl_FragColor = vec4(color.rgb * shadow, color.a);
    }
  `
}
