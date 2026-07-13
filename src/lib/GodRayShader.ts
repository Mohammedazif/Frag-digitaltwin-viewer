import * as THREE from 'three'

/**
 * GodRayShader v3 — Depth-Occlusion Light Scattering
 *
 * WHY v1/v2 FAILED:
 *   Extracting luminance from tDiffuse picks up the entire bright sky dome,
 *   not just the sun disk — this creates white fog/blobs covering the scene.
 *
 * CORRECT ALGORITHM (used in real engines):
 *   For each pixel, march toward the sun in screen space.
 *   At each step ask: is this screen-space point looking at SKY (depth ≈ 1.0)
 *   or GEOMETRY (depth < 1.0)?
 *     - SKY      → light is unoccluded  → accumulate ray brightness
 *     - GEOMETRY → light is blocked     → ray attenuates (creates shadow streak)
 *   The contrast between open-sky strips and geometry-blocked strips IS the ray.
 *
 * This way:
 *   - Only the actual gaps between buildings produce rays.
 *   - The general bright sky does NOT bleed into the scene.
 *   - Works correctly at any time of day / cloud density.
 */
export const GodRayShader = {
  uniforms: {
    /** Scene colour from previous pass */
    tDiffuse: { value: null as THREE.Texture | null },

    /**
     * Scene depth texture — REQUIRED.
     * Set this to composer.readBuffer.depthTexture every frame before render.
     * sky fragments have depth ≈ 1.0; geometry < 1.0.
     */
    tDepth: { value: null as THREE.DepthTexture | null },

    /** Sun UV position in [0,1]. Re-projected from JS every frame. */
    sunPositionScreen: { value: new THREE.Vector2(0.5, 0.8) },

    /** Brightness multiplier for the final additive ray colour */
    godRayStrength: { value: 0.8 },

    /** Exponential decay per step — controls ray length (0.94–0.98) */
    decay: { value: 0.96 },

    /**
     * Fraction of the pixel→sun distance covered by NUM_SAMPLES steps.
     * 0.6 = rays extend 60 % of the way to the sun.
     */
    density: { value: 0.65 },

    /** Per-step luminance weight before decay */
    weight: { value: 0.5 },

    /** Sun elevation (sin of altitude). Passed from JS. Fades rays at horizon. */
    sunElevation: { value: 1.0 },

    /** 0 = pass-through, 1 = active */
    enabled: { value: 1.0 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    #define NUM_SAMPLES 80
    // Sky depth threshold — Three.js Sky mesh uses gl_Position.z = gl_Position.w
    // so sky fragments sit exactly on the far plane → depth ≈ 1.0
    #define SKY_DEPTH   0.9999

    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2      sunPositionScreen;
    uniform float     godRayStrength;
    uniform float     decay;
    uniform float     density;
    uniform float     weight;
    uniform float     sunElevation;
    uniform float     enabled;

    varying vec2 vUv;

    // Cheap per-pixel dither value to break up banding from discrete steps
    float hash21(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);

      // ── Early out ──────────────────────────────────────────────────────────
      if (enabled < 0.5 || sunElevation < -0.05) {
        gl_FragColor = sceneColor;
        return;
      }

      // Don't run when sun is clearly off-screen (allow 30 % bleed margin)
      vec2 sunUV = sunPositionScreen;
      if (max(max(-sunUV.x, sunUV.x - 1.0), max(-sunUV.y, sunUV.y - 1.0)) > 0.30) {
        gl_FragColor = sceneColor;
        return;
      }

      // ── Jittered depth-occlusion march ─────────────────────────────────────
      float dither    = hash21(vUv);
      vec2  stepDelta = (vUv - sunUV) * (density / float(NUM_SAMPLES));

      float accumulated       = 0.0;
      float illuminationDecay = 1.0;
      vec2  sampleCoord       = vUv - stepDelta * dither;  // jitter start

      for (int i = 0; i < NUM_SAMPLES; i++) {
        sampleCoord -= stepDelta;
        vec2 clamped = clamp(sampleCoord, vec2(0.001), vec2(0.999));

        // ── Core: depth determines if this step sees sky or geometry ─────────
        float depth = texture2D(tDepth, clamped).r;
        float isSky = step(SKY_DEPTH, depth);  // 1.0 = sky (light), 0.0 = geometry (shadow)

        // Focus contribution toward the sun position so only near-sun sky glows
        float distFromSun = length(clamped - sunUV);
        float proximity   = 1.0 - smoothstep(0.0, 1.0, distFromSun);

        accumulated += isSky * illuminationDecay * weight * proximity;
        illuminationDecay *= decay;
      }

      // ── Normalise to [0, 1] ──────────────────────────────────────
      // Theoretical max when every sample is sky and proximity = 1:
      //   weight * (1-decay^N)/(1-decay)
      // Dividing by this keeps the result in [0,1] even if tDepth is
      // uninitialised and returns 1.0 for every sample (all-sky case).
      // An extra 0.5 factor accounts for average proximity < 1.
      float maxAcc = weight / (1.0 - decay) * 0.5;   // ~6.25 for defaults
      float normalised = clamp(accumulated / maxAcc, 0.0, 1.0);

      // ── Edge & horizon fade ────────────────────────────────────
      float edgeDist   = min(min(sunUV.x, 1.0 - sunUV.x), min(sunUV.y, 1.0 - sunUV.y));
      float edgeFade   = smoothstep(0.0, 0.20, edgeDist);
      float horizonFade = smoothstep(-0.05, 0.18, sunElevation);

      // ── Warm sun colour — orange near horizon, bright white at noon ────
      float warmth   = 1.0 - smoothstep(0.05, 0.45, sunElevation);
      vec3  sunColor = mix(vec3(1.0, 0.97, 0.90), vec3(1.0, 0.58, 0.12), warmth * 0.85);

      gl_FragColor = vec4(
        sceneColor.rgb + sunColor * normalised * godRayStrength * edgeFade * horizonFade,
        sceneColor.a
      );
    }
  `,
}
