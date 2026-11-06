import type { Material } from "three";

/** Shared time and wind strength for every swaying plant. */
export const windUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
};

export interface FoliageOptions {
  /** How far tips sway. 0 disables the vertex patch. */
  sway: number;
  /**
   * 0 = soft, almost colourless pastel; 1 = full colour. The garden island shares one
   * of these, so the whole garden brightens as the visitor helps flowers bloom.
   */
  bloom?: { value: number };
}

/**
 * Patches a built-in material with gentle wind sway (in the vertex shader) and an
 * optional colourfulness control (in the fragment shader). Works with instancing.
 */
export function patchFoliage(mat: Material, opts: FoliageOptions): void {
  const { sway, bloom } = opts;
  mat.onBeforeCompile = (shader) => {
    if (sway > 0) {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.uniforms.uWind = windUniforms.uWind;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          {
            vec4 base = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
              base = instanceMatrix * base;
            #endif
            base = modelMatrix * base;
            float h = max(position.y, 0.0);
            float phase = uTime * 1.6 + base.x * 0.55 + base.z * 0.4;
            float s = (sin(phase) * 0.65 + sin(phase * 2.3 + 1.3) * 0.25) * ${sway.toFixed(4)} * uWind * h * h;
            transformed.x += s;
            transformed.z += s * 0.45;
          }`,
        );
    }
    if (bloom) {
      shader.uniforms.uBloom = bloom;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uBloom;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          {
            float g = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 pale = mix(vec3(g), diffuseColor.rgb, 0.2) * 0.9 + 0.07;
            diffuseColor.rgb = mix(pale, diffuseColor.rgb, uBloom);
          }`,
        );
    }
  };
  mat.customProgramCacheKey = () => `foliage:${sway}:${bloom ? 1 : 0}`;
}
