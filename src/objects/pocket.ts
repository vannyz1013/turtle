import gsap from "gsap";
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import type { Motion } from "../core/motion";
import { C } from "@edition/palette";
import { glowTexture } from "../util/textures";

const R = 0.42;
const FLOAT_Y = 1.55;

/**
 * The pocket of happiness: an original floating gadget capsule. A pastel-yellow bowl and a
 * powder-blue lid with a sun emblem, a band of tiny lights, and two gold rings orbiting it,
 * all hovering above an ivory pedestal. Tapping it lifts the lid and lets the light out.
 */
export class HappinessPocket {
  readonly group = new Group();
  readonly proxy: Mesh;
  /** Where revealed messages appear. */
  readonly messageAnchor = new Object3D();
  isOpen = false;

  /** Bobs and grows on hover; the capsule inside squashes when it opens. */
  private readonly wrap = new Group();
  private readonly capsule = new Group();
  private readonly lidPivot = new Group();
  private readonly rings: Mesh[] = [];
  private readonly bandLights: MeshBasicMaterial;
  private readonly innerMat: MeshBasicMaterial;
  private readonly core: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly halo: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly state = { hover: 0, open: 0 };

  constructor(private readonly motion: Motion) {
    // Pedestal.
    const ivory = new MeshStandardMaterial({ color: C.ivory, roughness: 0.5 });
    const profile = [
      [0, 0],
      [0.55, 0],
      [0.55, 0.1],
      [0.42, 0.16],
      [0.26, 0.24],
      [0.2, 0.5],
      [0.22, 0.78],
      [0.36, 0.86],
      [0.42, 0.92],
      [0, 0.92],
    ].map(([x, y]) => new Vector2(x, y));
    const pedestal = new Mesh(new LatheGeometry(profile, 48), ivory);
    pedestal.castShadow = pedestal.receiveShadow = true;
    const leafBand = new Mesh(new TorusGeometry(0.24, 0.03, 10, 40), new MeshStandardMaterial({ color: C.sage, roughness: 0.6 }));
    leafBand.rotation.x = Math.PI / 2;
    leafBand.position.y = 0.6;
    const padGlow = new Mesh(new CircleGeometry(0.34, 40), new MeshBasicMaterial({ color: new Color(C.sky).multiplyScalar(1.4), transparent: true, opacity: 0.6, toneMapped: false }));
    padGlow.rotation.x = -Math.PI / 2;
    padGlow.position.y = 0.925;

    // Capsule bowl and lid.
    const bowl = new Mesh(
      new SphereGeometry(R, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new MeshPhysicalMaterial({ color: C.yellow, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, side: DoubleSide }),
    );
    bowl.castShadow = true;
    this.innerMat = new MeshBasicMaterial({ color: new Color("#FFF2C9"), toneMapped: false });
    const inner = new Mesh(new CircleGeometry(R * 0.97, 48), this.innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = -0.005;

    const lid = new Mesh(
      new SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new MeshPhysicalMaterial({ color: C.sky, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, side: DoubleSide }),
    );
    lid.castShadow = true;
    const emblem = this.sunEmblem();
    emblem.position.y = R - 0.01;
    const lidParts = new Group();
    lidParts.add(lid, emblem);
    lidParts.position.z = R; // pivot at the back edge
    this.lidPivot.position.z = -R;
    this.lidPivot.add(lidParts);

    // Band of tiny lights around the seam.
    const band = new Mesh(new TorusGeometry(R + 0.012, 0.03, 12, 64), new MeshStandardMaterial({ color: C.ivory, roughness: 0.35 }));
    band.rotation.x = Math.PI / 2;
    this.bandLights = new MeshBasicMaterial({ color: new Color(C.sky).multiplyScalar(2), toneMapped: false });
    const lights = new Group();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = new Mesh(new SphereGeometry(0.016, 10, 8), this.bandLights);
      d.position.set(Math.cos(a) * (R + 0.04), 0, Math.sin(a) * (R + 0.04));
      lights.add(d);
    }

    // Glowing core, revealed when open.
    this.core = new Mesh(new SphereGeometry(0.18, 24, 16), new MeshBasicMaterial({ color: new Color("#FFE3A0").multiplyScalar(2.5), transparent: true, opacity: 0, toneMapped: false }));
    this.core.position.y = 0.03;

    this.halo = new Mesh(
      new PlaneGeometry(2.6, 2.6),
      new MeshBasicMaterial({ map: glowTexture(), color: new Color("#FFE4A8"), transparent: true, opacity: 0.15, blending: AdditiveBlending, depthWrite: false }),
    );

    this.capsule.add(bowl, inner, this.lidPivot, band, lights, this.core);
    this.wrap.add(this.capsule);
    this.wrap.position.y = FLOAT_Y;

    // Gold gadget rings orbiting the capsule.
    const ringMat = new MeshStandardMaterial({ color: C.gold, roughness: 0.3, metalness: 0.6, emissive: "#FFD27A", emissiveIntensity: 0.25 });
    for (let i = 0; i < 2; i++) {
      const ring = new Mesh(new TorusGeometry(0.66 + i * 0.1, 0.012, 8, 80), ringMat);
      ring.position.y = FLOAT_Y;
      this.rings.push(ring);
      const bead = new Mesh(new SphereGeometry(0.035, 12, 10), new MeshBasicMaterial({ color: new Color(C.pink).multiplyScalar(1.8), toneMapped: false }));
      bead.position.x = 0.66 + i * 0.1;
      ring.add(bead);
    }

    this.proxy = new Mesh(new SphereGeometry(0.85, 12, 8), new MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = FLOAT_Y - 0.1;
    this.messageAnchor.position.y = FLOAT_Y + 0.95;

    this.group.add(pedestal, leafBand, padGlow, this.wrap, ...this.rings, this.halo, this.proxy, this.messageAnchor);
  }

  private sunEmblem(): Group {
    const g = new Group();
    const mat = new MeshStandardMaterial({ color: "#F7D77E", emissive: "#FFD27A", emissiveIntensity: 0.6, roughness: 0.4 });
    g.add(new Mesh(new CylinderGeometry(0.075, 0.075, 0.03, 28), mat));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ray = new Mesh(new SphereGeometry(0.022, 10, 8), mat);
      ray.scale.set(1, 0.6, 1);
      ray.position.set(Math.cos(a) * 0.115, 0, Math.sin(a) * 0.115);
      g.add(ray);
    }
    return g;
  }

  setHover(on: boolean): void {
    gsap.to(this.state, { hover: on ? 1 : 0, duration: 0.4, ease: "sine.out", overwrite: "auto" });
  }

  open(): Promise<void> {
    this.isOpen = true;
    const d = this.motion.reduced ? 0.45 : 0.8;
    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: () => resolve() })
        .to(this.capsule.scale, { x: 1.08, y: 0.92, z: 1.08, duration: 0.14, ease: "sine.out" })
        .to(this.capsule.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" })
        .to(this.lidPivot.rotation, { x: -1.75, duration: d, ease: "back.out(1.7)" }, 0.1)
        .to(this.state, { open: 1, duration: 0.6, ease: "sine.out" }, 0.15);
    });
  }

  close(): Promise<void> {
    this.isOpen = false;
    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: () => resolve() })
        .to(this.lidPivot.rotation, { x: 0, duration: 0.4, ease: "power2.in" })
        .to(this.state, { open: 0, duration: 0.35, ease: "sine.in" }, 0);
    });
  }

  /** World position of the glowing core (where the sparkles burst from). */
  coreWorld(out = new Vector3()): Vector3 {
    return this.core.getWorldPosition(out);
  }

  update(t: number, camPos: Vector3): void {
    const m = this.motion.amount;
    const { hover, open } = this.state;
    this.wrap.position.y = FLOAT_Y + Math.sin(t * 1.3) * 0.06 * m;
    this.wrap.rotation.z = Math.sin(t * 0.8) * 0.04 * m;
    this.wrap.scale.setScalar(1 + hover * 0.07);
    this.rings[0].rotation.set(1.2 + Math.sin(t * 0.4) * 0.2, t * 0.6 * m, 0.3);
    this.rings[1].rotation.set(-1.0, -t * 0.45 * m, -0.4 + Math.cos(t * 0.3) * 0.2);
    this.rings.forEach((r) => (r.position.y = this.wrap.position.y));
    this.bandLights.color.setRGB(0.66, 0.84, 0.92).multiplyScalar(1.4 + hover * 1.2 + Math.sin(t * 4) * 0.4 + open);
    this.innerMat.color.setRGB(1, 0.95, 0.79).multiplyScalar(0.6 + open * 2.2);
    this.core.material.opacity = open;
    this.core.scale.setScalar(0.6 + open * 0.4 + Math.sin(t * 5) * 0.04 * open);
    this.halo.position.set(0, this.wrap.position.y, 0);
    this.halo.lookAt(camPos);
    this.halo.material.opacity = 0.14 + hover * 0.3 + open * 0.55;
  }
}
