import { BackSide, Color, Group, Mesh, ShaderMaterial, SphereGeometry, Vector3, type Camera } from "three";
import { C } from "@edition/palette";

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // always at the far plane
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uTopDay;
  uniform vec3 uMidDay;
  uniform vec3 uHorizonDay;
  uniform vec3 uTopGold;
  uniform vec3 uMidGold;
  uniform vec3 uHorizonGold;
  uniform vec3 uBelow;
  uniform vec3 uSunDir;
  uniform float uGolden;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 top = mix(uTopDay, uTopGold, uGolden);
    vec3 mid = mix(uMidDay, uMidGold, uGolden);
    vec3 hor = mix(uHorizonDay, uHorizonGold, uGolden);
    vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));
    col = mix(col, top, smoothstep(0.18, 0.75, h));
    col = mix(col, mix(uBelow, hor, 0.45), smoothstep(0.0, -0.3, h));

    float s = max(dot(d, normalize(uSunDir)), 0.0);
    vec3 sunCol = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.74, 0.45), uGolden);
    col += sunCol * (pow(s, 5.0) * (0.18 + 0.2 * uGolden) + pow(s, 48.0) * 0.45);
    col += sunCol * smoothstep(0.9975, 0.9988, s) * 1.6;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A gradient sky dome with a soft sun. `golden` blends towards a warm sunset. */
export class Sky {
  readonly group = new Group();
  readonly uniforms = {
    uTopDay: { value: new Color("#8EC6E6") },
    uMidDay: { value: new Color(C.powder) },
    uHorizonDay: { value: new Color(C.ivory) },
    uTopGold: { value: new Color("#A9B9E0") },
    uMidGold: { value: new Color("#F2C9B8") },
    uHorizonGold: { value: new Color("#FFD99C") },
    uBelow: { value: new Color("#DCEBF2") },
    uSunDir: { value: new Vector3(-0.38, 0.5, -0.78).normalize() },
    uGolden: { value: 0 },
  };
  private readonly daySun = new Vector3(-0.38, 0.5, -0.78).normalize();
  private readonly goldSun = new Vector3(-0.62, 0.12, -0.78).normalize();

  constructor() {
    const mat = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: BackSide,
      depthWrite: false,
      fog: false,
    });
    const dome = new Mesh(new SphereGeometry(400, 48, 24), mat);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);
  }

  setGolden(g: number): void {
    this.uniforms.uGolden.value = g;
    this.uniforms.uSunDir.value.lerpVectors(this.daySun, this.goldSun, g).normalize();
  }

  /** The colour fog should blend into, matching the horizon. */
  horizon(out: Color): Color {
    return out.lerpColors(this.uniforms.uHorizonDay.value, this.uniforms.uHorizonGold.value, this.uniforms.uGolden.value);
  }

  follow(camera: Camera): void {
    this.group.position.copy(camera.position);
  }
}
