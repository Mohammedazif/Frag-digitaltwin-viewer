import * as THREE from 'three'

/**
 * ColorGradeShader
 *
 * Full-screen post-processing pass for cinematic color grading.
 *
 * Features (applied in order):
 *  0. Chromatic Aberration — RGB channel UV-shift, stronger at screen edges
 *  1. Color Temperature     — Kelvin-to-RGB tint multiply
 *  2. Saturation            — luminance-preserving saturation control
 *  3. Contrast              — pivot at 0.5, linear scaling
 *  4. Vignette              — radial darkening toward screen corners
 */
export const ColorGradeShader = {
  uniforms: {
    tDiffuse:            { value: null as THREE.Texture | null },
    saturation:          { value: 1.0 },
    contrast:            { value: 1.0 },
    temperature:         { value: 6500.0 },   // Kelvin
    vignette:            { value: 0.4 },
    chromaticAberration: { value: 0.0 },      // 0 = off, 1 = max lens fringing
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float temperature;
    uniform float vignette;
    uniform float chromaticAberration;

    varying vec2 vUv;

    // Approximate blackbody RGB for a given colour temperature (Kelvin).
    // Tanner Helland's algorithm, rescaled to 0-1.
    vec3 kelvinToRGB(float temp) {
      temp = clamp(temp, 1000.0, 40000.0) / 100.0;
      vec3 c;

      if (temp <= 66.0) {
        c.r = 255.0;
        c.g = clamp(99.4708025861 * log(temp) - 161.1195681661, 0.0, 255.0);
        c.b = temp <= 19.0 ? 0.0
            : clamp(138.5177312231 * log(temp - 10.0) - 305.0447927307, 0.0, 255.0);
      } else {
        c.r = clamp(329.698727446  * pow(temp - 60.0, -0.1332047592), 0.0, 255.0);
        c.g = clamp(288.1221695283 * pow(temp - 60.0, -0.0755148492), 0.0, 255.0);
        c.b = 255.0;
      }
      return c / 255.0;
    }

    void main() {
      // ── 0. Chromatic Aberration ──────────────────────────────────────────
      // Shift R outward and B inward relative to the screen center.
      // The offset is proportional to distance from center so corners get
      // the strongest fringing — exactly like a real camera lens.
      vec3 color;
      if (chromaticAberration > 0.001) {
        vec2 offset = (vUv - 0.5) * chromaticAberration * 0.028;
        color.r = texture2D(tDiffuse, vUv + offset).r;
        color.g = texture2D(tDiffuse, vUv          ).g;
        color.b = texture2D(tDiffuse, vUv - offset).b;
      } else {
        color = texture2D(tDiffuse, vUv).rgb;
      }

      float origAlpha = texture2D(tDiffuse, vUv).a;

      // ── 1. Temperature ────────────────────────────────────────────────────
      vec3 tint    = kelvinToRGB(temperature);
      vec3 neutral = kelvinToRGB(6500.0);
      color *= tint / max(neutral, vec3(0.001));

      // ── 2. Saturation ─────────────────────────────────────────────────────
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(lum), color, saturation);

      // ── 3. Contrast ───────────────────────────────────────────────────────
      color = (color - 0.5) * max(contrast, 0.0) + 0.5;

      // ── 4. Vignette ───────────────────────────────────────────────────────
      vec2  center = vUv - 0.5;
      float dist   = length(center);
      float vig    = smoothstep(0.8, 0.2, dist * (1.0 + vignette));
      color *= mix(1.0, vig, vignette);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), origAlpha);
    }
  `,
}
