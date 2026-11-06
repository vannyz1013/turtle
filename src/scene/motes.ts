import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3 } from "three";
import { range, type Rand } from "../util/random";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMotion;
  attribute float aSeed;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    float s = aSeed * 6.2831;
    float t = uTime * uMotion;
    p.x += sin(t * 0.21 + s) * 0.9;
    p.y += sin(t * 0.29 + s * 1.7) * 0.55 + sin(t * 0.11 + s) * 0.3;
    p.z += cos(t * 0.17 + s * 1.3) * 0.9;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.45 + aSeed) * uPixelRatio * (24.0 / max(-mv.z, 0.5));
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + s * 3.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(uColor * 1.6, a * vTwinkle * uOpacity);
  }
`;

export interface MoteRegion {
  center: Vector3;
  size: Vector3;
  count: number;
}

/** Soft glowing specks of light drifting through the air. */
export class Motes {
  readonly points: Points;
  readonly uniforms = {
    uTime: { value: 0 },
    uSize: { value: 2.2 },
    uPixelRatio: { value: 1 },
    uMotion: { value: 1 },
    uColor: { value: new Color("#FFE8A8") },
    uOpacity: { value: 0.9 },
  };

  constructor(regions: MoteRegion[], rand: Rand) {
    const pos: number[] = [];
    const seeds: number[] = [];
    for (const r of regions) {
      for (let i = 0; i < r.count; i++) {
        pos.push(
          r.center.x + range(rand, -0.5, 0.5) * r.size.x,
          r.center.y + range(rand, 0, 1) * r.size.y,
          r.center.z + range(rand, -0.5, 0.5) * r.size.z,
        );
        seeds.push(rand());
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    const mat = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geo, mat);
    this.points.frustumCulled = false;
  }

  update(t: number, pixelRatio: number, motion: number): void {
    this.uniforms.uTime.value = t;
    this.uniforms.uPixelRatio.value = pixelRatio;
    this.uniforms.uMotion.value = motion;
  }
}
