import * as THREE from 'three'

export const ColorGradeShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'saturation': { value: 1.0 },
    'contrast': { value: 1.0 },
    'temperature': { value: 6500.0 }, // in Kelvin
    'vignette': { value: 0.4 }
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
    uniform float saturation;
    uniform float contrast;
    uniform float temperature;
    uniform float vignette;
    varying vec2 vUv;

    // Convert Kelvin to RGB (approximate fit)
    vec3 kelvinToRGB(float temp) {
      temp = clamp(temp, 1000.0, 40000.0) / 100.0;
      vec3 color;
      
      if (temp <= 66.0) {
        color.r = 255.0;
        color.g = clamp(99.4708025861 * log(temp) - 161.1195681661, 0.0, 255.0);
        if (temp <= 19.0) color.b = 0.0;
        else color.b = clamp(138.5177312231 * log(temp - 10.0) - 305.0447927307, 0.0, 255.0);
      } else {
        color.r = clamp(329.698727446 * pow(temp - 60.0, -0.1332047592), 0.0, 255.0);
        color.g = clamp(288.1221695283 * pow(temp - 60.0, -0.0755148492), 0.0, 255.0);
        color.b = 255.0;
      }
      return color / 255.0;
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // 1. Temperature (Color Tint)
      // Base temp is 6500K. We calculate the target RGB and multiply.
      vec3 tint = kelvinToRGB(temperature);
      vec3 neutral = kelvinToRGB(6500.0);
      color *= (tint / neutral);

      // 2. Saturation
      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luminance), color, saturation);

      // 3. Contrast
      color = (color - 0.5) * max(contrast, 0.0) + 0.5;

      // 4. Vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float v = smoothstep(0.8, 0.2, dist * (1.0 + vignette));
      color *= mix(1.0, v, vignette);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `
}
