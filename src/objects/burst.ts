import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3 } from "three";
import type { Stage } from "../core/stage";

const vertex = /* glsl */ `
  uniform float uT;
  uniform float uLife;
  uniform float uPixelRatio;
  attribute vec3 aVel;
  attribute vec3 aColor;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = uT;
    // Fast out, then a slow drift upwards like dandelion fluff.
    vec3 p = position + aVel * (1.0 - exp(-t * 2.4)) / 2.4 + vec3(0.0, 0.22 * t, 0.0);
    p.x += sin(t * 2.0 + aSeed * 20.0) * 0.06 * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float life = clamp(t / uLife, 0.0, 1.0);
    gl_PointSize = (3.0 + aSeed * 5.0) * uPixelRatio * (1.0 - life * 0.5) * (14.0 / max(-mv.z, 0.5));
    vColor = aColor;
    vAlpha = pow(1.0 - life, 1.4) * (0.65 + 0.35 * sin(t * 12.0 + aSeed * 30.0));
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * 2.0, a * a * vAlpha);
  }
`;

export type Burst = (origin: Vector3, palette: readonly string[], count?: number) => void;

/** A gentle burst of glowing sparkles. Each burst cleans itself up when it fades. */
export function createBursts(stage: Stage): Burst {
  return (origin, palette, count = 90) => {
    const pos: number[] = [];
    const vel: number[] = [];
    const col: number[] = [];
    const seed: number[] = [];
    const c = new Color();
    for (let i = 0; i < count; i++) {
      pos.push(origin.x, origin.y, origin.z);
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.9 + 0.1; // mostly upwards
      const speed = 0.8 + Math.random() * 1.6;
      vel.push(Math.cos(u) * Math.sqrt(1 - v * v) * speed, v * speed, Math.sin(u) * Math.sqrt(1 - v * v) * speed);
      c.set(palette[i % palette.length]);
      col.push(c.r, c.g, c.b);
      seed.push(Math.random());
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setAttribute("aVel", new Float32BufferAttribute(vel, 3));
    geo.setAttribute("aColor", new Float32BufferAttribute(col, 3));
    geo.setAttribute("aSeed", new Float32BufferAttribute(seed, 1));
    const uniforms = { uT: { value: 0 }, uLife: { value: 2.2 }, uPixelRatio: { value: stage.currentPixelRatio } };
    const mat = new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const points = new Points(geo, mat);
    points.frustumCulled = false;
    stage.scene.add(points);
    const off = stage.onTick((_t, dt) => {
      uniforms.uT.value += dt;
      if (uniforms.uT.value > uniforms.uLife.value) {
        off();
        stage.scene.remove(points);
        geo.dispose();
        mat.dispose();
      }
    });
  };
}
