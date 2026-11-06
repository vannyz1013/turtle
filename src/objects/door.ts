import gsap from "gsap";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import type { Motion } from "../core/motion";
import { C } from "@edition/palette";
import { mergeAll, paint, shade } from "../util/geometry";
import { archShape, starShape } from "../util/shapes";
import { glowTexture } from "../util/textures";

const OUTER_W = 1.72;
const OUTER_H = 2.92;
const INNER_W = 1.16;
const INNER_H = 2.52;
const BASE = 0.26; // height of the stone platform

const portalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const portalFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vUv;
  void main() {
    vec2 p = vec2(vUv.x / ${(INNER_W / 2).toFixed(3)}, (vUv.y - ${(INNER_H * 0.55).toFixed(3)}) / ${(INNER_H * 0.5).toFixed(3)});
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = 0.5 + 0.5 * sin(a * 3.0 + r * 6.0 - uTime * 1.4);
    float swirl2 = 0.5 + 0.5 * sin(a * -2.0 + r * 9.0 + uTime * 0.9);
    vec3 ivory = vec3(1.0, 0.97, 0.9);
    vec3 gold = vec3(1.0, 0.85, 0.55);
    vec3 pink = vec3(1.0, 0.78, 0.8);
    vec3 sky = vec3(0.75, 0.9, 1.0);
    vec3 col = mix(gold, pink, swirl * 0.6);
    col = mix(col, sky, swirl2 * 0.35 * smoothstep(0.2, 1.0, r));
    col = mix(ivory, col, smoothstep(0.0, 0.85, r));
    float bright = 1.2 + 1.3 * (1.0 - smoothstep(0.0, 1.0, r));
    gl_FragColor = vec4(col * bright * uOpen, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The magical door: an original free-standing arched door on a round stone step, painted
 * in powder blue and pale gold, with a starry porthole, a little sun on the keystone,
 * blossoms climbing the frame and a ring of tiny orbiting lights.
 * Hovering makes it glow; opening reveals warm light from somewhere else.
 */
export class MagicDoor {
  readonly group = new Group();
  readonly proxy: Mesh;
  private readonly pivot = new Group();
  private readonly frameMat: MeshStandardMaterial;
  private readonly halo: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly portal: Mesh<ShapeGeometry, ShaderMaterial>;
  private readonly orbs: Mesh[] = [];
  private readonly window: MeshStandardMaterial;
  private readonly glowState = { hover: 0, open: 0 };

  constructor(private readonly motion: Motion) {
    // Stone platform.
    const stoneMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const stone = new Mesh(
      mergeAll([
        shade(new CylinderGeometry(1.25, 1.35, 0.16, 40).translate(0, 0.08, 0), C.stone, 0.82),
        shade(new CylinderGeometry(0.98, 1.05, 0.1, 40).translate(0, 0.21, 0), "#F3EEE3", 0.88),
      ]),
      stoneMat,
    );
    stone.receiveShadow = stone.castShadow = true;

    // Frame: an arch with an arched opening.
    const frameShape = archShape(OUTER_W, OUTER_H);
    frameShape.holes.push(archShape(INNER_W, INNER_H));
    const frameGeo = new ExtrudeGeometry(frameShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
      curveSegments: 40,
    });
    frameGeo.translate(0, BASE, -0.12);
    this.frameMat = new MeshStandardMaterial({ color: C.yellow, roughness: 0.45, metalness: 0.05, emissive: "#FFE2A0", emissiveIntensity: 0 });
    const frame = new Mesh(frameGeo, this.frameMat);
    frame.castShadow = frame.receiveShadow = true;

    // Keystone sun.
    const sun = new Group();
    const sunMat = new MeshStandardMaterial({ color: "#F7D77E", emissive: "#FFD27A", emissiveIntensity: 0.9, roughness: 0.4 });
    const disc = new Mesh(new CylinderGeometry(0.15, 0.15, 0.06, 32), sunMat);
    disc.rotation.x = Math.PI / 2;
    sun.add(disc);
    for (let i = 0; i < 10; i++) {
      const ray = new Mesh(new BoxGeometry(0.035, 0.09, 0.04), sunMat);
      const a = (i / 10) * Math.PI * 2;
      ray.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
      ray.rotation.z = a - Math.PI / 2;
      sun.add(ray);
    }
    sun.position.set(0, BASE + OUTER_H + 0.06, 0.06);

    // Door panel, hinged on its left edge.
    const panelGeo = new ExtrudeGeometry(archShape(INNER_W - 0.04, INNER_H - 0.02, (INNER_W - 0.04) / 2), {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
      curveSegments: 40,
    });
    const panelMat = new MeshStandardMaterial({ color: "#9CCDE6", roughness: 0.5 });
    const panel = new Mesh(panelGeo, panelMat);
    panel.castShadow = true;
    const panelW = INNER_W - 0.04;

    // Raised inset panels.
    const trimMat = new MeshStandardMaterial({ color: C.ivory, roughness: 0.5 });
    const inset = (w: number, h: number, x: number, y: number) => {
      const shape = archShape(w, h, x);
      const outline = new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 24 });
      const m = new Mesh(outline, new MeshStandardMaterial({ color: "#B5DBEE", roughness: 0.5 }));
      m.position.set(0, y, 0.085);
      return m;
    };
    const lower = inset(panelW * 0.62, 0.7, panelW / 2, 0.18);

    // Porthole window with a star.
    const portY = INNER_H * 0.67;
    const ring = new Mesh(new TorusGeometry(0.21, 0.035, 14, 40), new MeshStandardMaterial({ color: C.gold, roughness: 0.3, metalness: 0.6 }));
    ring.position.set(panelW / 2, portY, 0.095);
    this.window = new MeshStandardMaterial({ color: "#FFF6DD", emissive: "#FFE4A8", emissiveIntensity: 0.9, roughness: 0.15 });
    const glass = new Mesh(new CircleGeometry(0.2, 40), this.window);
    glass.position.set(panelW / 2, portY, 0.09);
    const star = new Mesh(new ShapeGeometry(starShape(0.11, 0.05)), new MeshBasicMaterial({ color: new Color(C.yellow).multiplyScalar(1.6), toneMapped: false }));
    star.position.set(panelW / 2, portY, 0.096);

    const knob = new Mesh(new SphereGeometry(0.055, 20, 14), new MeshStandardMaterial({ color: C.gold, roughness: 0.25, metalness: 0.7 }));
    knob.position.set(panelW - 0.14, INNER_H * 0.42, 0.12);
    const hinges = [0.5, INNER_H - 0.7].map((y) => {
      const h = new Mesh(new CylinderGeometry(0.025, 0.025, 0.16, 10), trimMat);
      h.position.set(0.01, y, 0.04);
      return h;
    });

    this.pivot.add(panel, lower, ring, glass, star, knob, ...hinges);
    this.pivot.position.set(-INNER_W / 2 + 0.02, BASE, -0.04);

    // Light from the other side, seen when the door opens.
    this.portal = new Mesh(
      new ShapeGeometry(archShape(INNER_W, INNER_H), 40),
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
        vertexShader: portalVertex,
        fragmentShader: portalFragment,
        side: DoubleSide,
        fog: false,
      }),
    );
    this.portal.position.set(0, BASE, -0.07);
    this.portal.visible = false;

    // Soft halo behind the door.
    this.halo = new Mesh(
      new PlaneGeometry(4.4, 4.8),
      new MeshBasicMaterial({ map: glowTexture(), color: new Color("#FFE7B0"), transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false }),
    );
    this.halo.position.set(0, BASE + 1.5, -0.3);

    // Blossoms climbing the frame.
    const vines = this.vines();

    // Tiny orbiting lights.
    const orbMat = new MeshBasicMaterial({ color: new Color(C.yellow).multiplyScalar(2.6), toneMapped: false });
    for (let i = 0; i < 7; i++) {
      const o = new Mesh(new SphereGeometry(0.03, 10, 8), orbMat);
      this.orbs.push(o);
    }

    this.proxy = new Mesh(new BoxGeometry(OUTER_W + 0.3, OUTER_H + 0.6, 0.9), new MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = BASE + OUTER_H / 2;

    this.group.add(stone, frame, sun, this.pivot, this.portal, this.halo, vines, ...this.orbs, this.proxy);
  }

  private vines(): Mesh {
    const parts: BufferGeometry[] = [];
    const leafTones = [C.sage, "#9DB48F", "#B4C7A2"];
    const flowerTones = [C.pink, C.ivory, "#F3B9C1", C.lilac];
    // Points along the outer edge of the arch, left side up and over.
    const r = OUTER_W / 2 + 0.03;
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 9; i++) pts.push([-r, BASE + 0.15 + i * 0.2, (i * 0.7) % 1]);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI - (i / 8) * Math.PI * 0.55;
      pts.push([Math.cos(a) * r, BASE + OUTER_H - OUTER_W / 2 + Math.sin(a) * r, (i * 0.37) % 1]);
    }
    for (let i = 0; i < 4; i++) pts.push([r, BASE + 0.15 + i * 0.22, (i * 0.53) % 1]);
    pts.forEach(([x, y, k], i) => {
      const leaf = new SphereGeometry(0.075, 8, 5).scale(0.5, 0.14, 1).translate(0, 0, 0.07);
      leaf.rotateX(-0.4).rotateY(i * 2.4).rotateZ(k - 0.5);
      parts.push(paint(leaf, leafTones[i % leafTones.length]).translate(x, y, 0.12));
      if (i % 2 === 0) {
        const bloom = new SphereGeometry(0.055, 10, 8).scale(1, 0.75, 1);
        parts.push(paint(bloom, flowerTones[i % flowerTones.length]).translate(x + (k - 0.5) * 0.08, y + 0.05, 0.16));
        parts.push(paint(new SphereGeometry(0.022, 8, 6), "#F2C760").translate(x + (k - 0.5) * 0.08, y + 0.07, 0.205));
      }
    });
    const m = new Mesh(mergeAll(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    m.castShadow = true;
    return m;
  }

  setHover(on: boolean): void {
    gsap.to(this.glowState, { hover: on ? 1 : 0, duration: 0.45, ease: "sine.out", overwrite: true });
  }

  /** Swings the door open and lets the light through. */
  open(): Promise<void> {
    this.portal.visible = true;
    const reduced = this.motion.reduced;
    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: () => resolve() })
        .to(this.pivot.rotation, { y: -0.08, duration: 0.25, ease: "sine.out" })
        .to(this.pivot.rotation, { y: 1.95, duration: reduced ? 0.8 : 1.5, ease: "power2.inOut" })
        .to(this.glowState, { open: 1, duration: 1.2, ease: "sine.inOut" }, 0.3)
        .to(this.portal.material.uniforms.uOpen, { value: 1, duration: 1.0, ease: "sine.out" }, 0.25);
    });
  }

  /** Closes the door instantly (used while the screen is hidden by a flash). */
  reset(): void {
    gsap.killTweensOf([this.pivot.rotation, this.glowState, this.portal.material.uniforms.uOpen]);
    this.pivot.rotation.y = 0;
    this.glowState.open = 0;
    this.glowState.hover = 0;
    this.portal.material.uniforms.uOpen.value = 0;
    this.portal.visible = false;
  }

  /** World position of the doorway centre. */
  doorway(out = new Vector3()): Vector3 {
    return this.group.localToWorld(out.set(0, BASE + INNER_H * 0.5, 0));
  }

  update(t: number): void {
    const { hover, open } = this.glowState;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    this.frameMat.emissiveIntensity = hover * (0.32 + pulse * 0.12) + open * 0.2;
    this.halo.material.opacity = 0.16 + pulse * 0.05 + hover * 0.4 + open * 0.55;
    this.window.emissiveIntensity = 0.8 + hover * 0.8 + pulse * 0.2;
    this.portal.material.uniforms.uTime.value = t;
    const m = this.motion.amount;
    this.orbs.forEach((o, i) => {
      const a = t * 0.45 * m + (i / this.orbs.length) * Math.PI * 2;
      o.position.set(Math.cos(a) * 1.25, BASE + 1.55 + Math.sin(a) * 1.75, 0.35 + Math.sin(a * 2 + i) * 0.15);
      o.scale.setScalar(0.8 + hover * 0.6 + 0.3 * Math.sin(t * 3 + i));
    });
  }
}
