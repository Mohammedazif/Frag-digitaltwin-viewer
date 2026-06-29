import * as THREE from 'three'

export const CloudShader = {
  uniforms: {
    time: { value: 0.0 },
    sunPosition: { value: new THREE.Vector3(0, 1, 0) },
    cloudDensity: { value: 0.5 },
    cloudColor: { value: new THREE.Color(0xffffff) }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    uniform float time;
    uniform vec3 sunPosition;
    uniform float cloudDensity;
    uniform vec3 cloudColor;

    // Pseudo-random hash
    float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    // 3D Noise
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)),f.x),
                       mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)),f.x),
                       mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)),f.x),f.y),f.z);
    }

    // Fractal Brownian Motion
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

    void main() {
        // Normalize world position to get ray direction from center
        vec3 dir = normalize(vWorldPosition);
        
        // Only render clouds in the upper hemisphere
        if(dir.y < 0.0) {
            discard;
        }
        
        // Project ray onto a virtual cloud layer plane at height 1.0
        float t = 1.0 / max(dir.y, 0.001); 
        vec3 p = dir * t;
        
        // Scale and animate (clouds drift horizontally over time)
        vec3 q = p * 4.0 + vec3(time * 0.5, 0.0, time * 0.3);
        
        // Evaluate noise
        float n = fbm(q);
        
        // Cloud density mapping
        // n ranges from ~0.2 to ~0.8
        float coverage = (cloudDensity - 0.5) * 1.5; // shift and scale
        float c = smoothstep(0.4 - coverage, 0.7 - coverage, n);
        
        // Lighting from the sun
        vec3 sunDir = normalize(sunPosition);
        float sunDot = max(dot(dir, sunDir), 0.0);
        
        // Silver lining effect around the sun
        vec3 finalColor = mix(cloudColor, vec3(1.0, 1.0, 0.95), pow(sunDot, 8.0) * 0.8);
        
        // Soften horizon
        float horizonFade = smoothstep(0.0, 0.15, dir.y);
        c *= horizonFade;
        
        // Final opacity
        float opacity = c * 0.8;
        
        // Discard nearly invisible pixels to save fill rate
        if(opacity < 0.01) discard;
        
        gl_FragColor = vec4(finalColor, opacity);
    }
  `
}
