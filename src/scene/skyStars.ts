import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial } from "three";
import type { Rand } from "../util/random";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vTwinkle;
  void main() {
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
    gl_PointSize = (2.5 + aSeed * 5.0) * uPixelRatio;
    vTwinkle = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 40.0), 2.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    // A soft dot with a faint four-point sparkle.
    float core = smoothstep(0.5, 0.0, d);
    float rays = max(0.0, 1.0 - abs(c.x) * 14.0) * max(0.0, 1.0 - abs(c.y) * 2.2)
               + max(0.0, 1.0 - abs(c.y) * 14.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
    float a = (core * core + rays * 0.5) * vTwinkle * uOpacity;
    gl_FragColor = vec4(vec3(1.0, 0.93, 0.75) * 1.8, a);
  }
`;

/** Little twinkling stars across the upper sky, hidden until the finale. */
export class SkyStars {
  readonly points: Points;
  readonly uniforms = { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 0 } };

  constructor(rand: Rand, count = 260) {
    const pos: number[] = [];
    const seeds: number[] = [];
    for (let i = 0; i < count; i++) {
      const y = 0.12 + rand() * 0.85;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      pos.push(Math.cos(a) * r * 300, y * 300, Math.sin(a) * r * 300);
      seeds.push(rand());
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
    this.points = new Points(
      geo,
      new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = -9;
  }

  update(t: number, pixelRatio: number): void {
    this.uniforms.uTime.value = t;
    this.uniforms.uPixelRatio.value = pixelRatio;
    this.points.visible = this.uniforms.uOpacity.value > 0.001;
  }
}
