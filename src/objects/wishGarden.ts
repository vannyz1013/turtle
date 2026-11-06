import gsap from "gsap";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import type { Island } from "../scene/island";
import { SPOT } from "../scene/layout";
import { C } from "@edition/palette";
import { createRand, range, type Rand } from "../util/random";
import { glowTexture } from "../util/textures";

const COUNT = 12;
const TONES = [C.rose, C.yellow, C.bluebell, C.lilac, C.peach, "#F7A8A0", C.pink, "#B8E0C2", "#F6C76A", "#C8B5F0", "#8EC9EE", "#F4A9C8"];
const PALE = new Color("#ECE8DE");

/** Where the twelve wish flowers grow (x, z only). Deterministic, so decor can keep clear. */
export function planWishSpots(): Vector3[] {
  const rand = createRand(777);
  const out: Vector3[] = [];
  const c = SPOT.gardenCenter;
  for (let tries = 0; out.length < COUNT && tries < 2000; tries++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 4.3 + 0.4;
    const p = new Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r * 0.85);
    if (out.every((q) => q.distanceTo(p) > 1.35)) out.push(p);
  }
  return out;
}

/**
 * Moves any planned spot that stands between a viewer and the subject (on the ground plane)
 * sideways, just out of that corridor, keeping its distance from the other flowers.
 * Spots outside the corridor are returned unchanged, so only obstructing flowers move.
 */
export function clearSightline(
  spots: readonly Vector3[],
  subject: Vector3,
  viewers: readonly Vector3[],
  halfWidth: number,
  length: number,
  minGap = 1.15,
): Vector3[] {
  const out = spots.map((s) => s.clone());
  for (let i = 0; i < out.length; i++) {
    for (const viewer of viewers) {
      const dx = viewer.x - subject.x;
      const dz = viewer.z - subject.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const px = out[i].x - subject.x;
      const pz = out[i].z - subject.z;
      const along = px * ux + pz * uz; // towards the viewer
      if (along < -0.3 || along > length) continue;
      const side = -px * uz + pz * ux; // signed sideways distance from the sightline
      if (Math.abs(side) >= halfWidth) continue;
      const dir = side >= 0 ? 1 : -1;
      let off = halfWidth + 0.15;
      const at = () => new Vector3(subject.x + ux * along - uz * off * dir, out[i].y, subject.z + uz * along + ux * off * dir);
      let candidate = at();
      while (out.some((q, j) => j !== i && q.distanceTo(candidate) < minGap) && off < halfWidth + 3) {
        off += 0.2;
        candidate = at();
      }
      out[i] = candidate;
    }
  }
  return out;
}

const petalGeo = new SphereGeometry(0.16, 16, 8).scale(0.58, 0.15, 1).translate(0, 0, 0.15);
const innerGeo = new SphereGeometry(0.11, 12, 8).scale(0.58, 0.15, 1).translate(0, 0, 0.11);
const leafGeo = new SphereGeometry(0.1, 10, 6).scale(0.45, 0.08, 1).translate(0, 0, 0.1);
const coreGeo = new SphereGeometry(0.07, 18, 12);
const proxyGeo = new SphereGeometry(0.5, 10, 8);
const stemMat = new MeshStandardMaterial({ color: C.deepSage, roughness: 0.7 });

/** One large interactive flower: a bud that opens into a glowing bloom. */
export class WishFlower {
  readonly group = new Group();
  readonly head = new Group();
  readonly proxy: Mesh;
  bloomed = false;
  /** The flower's full bloom colour, as hex. */
  readonly tone: string;

  private readonly outer: Group[] = [];
  private readonly inner: Group[] = [];
  private readonly petalMat: MeshStandardMaterial;
  private readonly innerMat: MeshStandardMaterial;
  private readonly coreMat: MeshStandardMaterial;
  private readonly glow: Sprite;
  private readonly target: Color;
  private readonly state = { hover: 0, open: 0, flash: 0 };
  private readonly phase: number;

  constructor(
    pos: Vector3,
    readonly index: number,
    rand: Rand,
    tones: readonly string[] = TONES,
  ) {
    this.tone = tones[index % tones.length];
    this.target = new Color(this.tone);
    this.phase = rand() * 10;
    const h = range(rand, 0.5, 0.72);
    const bend = range(rand, -0.12, 0.12);
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(bend * 0.3, h * 0.5, bend * 0.2), new Vector3(bend, h, 0)]);
    const stem = new Mesh(new TubeGeometry(curve, 14, 0.02, 6), stemMat);
    stem.castShadow = true;
    const leafMat = new MeshStandardMaterial({ color: "#9DB48F", roughness: 0.65 });
    for (const [t, rot] of [
      [0.3, 0],
      [0.5, Math.PI],
    ] as const) {
      const leaf = new Mesh(leafGeo, leafMat);
      leaf.position.copy(curve.getPoint(t));
      leaf.rotation.set(-0.5, rot + rand(), 0);
      leaf.castShadow = true;
      this.group.add(leaf);
    }

    this.petalMat = new MeshStandardMaterial({ color: this.target.clone().lerp(PALE, 0.65), roughness: 0.55, emissive: this.target, emissiveIntensity: 0 });
    this.innerMat = new MeshStandardMaterial({ color: this.target.clone().lerp(PALE, 0.4), roughness: 0.55, emissive: this.target, emissiveIntensity: 0 });
    this.coreMat = new MeshStandardMaterial({ color: "#F6D57A", emissive: "#FFD27A", emissiveIntensity: 0.15, roughness: 0.4 });

    for (let i = 0; i < 7; i++) {
      const pivot = new Group();
      pivot.rotation.y = (i / 7) * Math.PI * 2;
      const petal = new Mesh(petalGeo, this.petalMat);
      petal.castShadow = true;
      pivot.add(petal);
      this.outer.push(pivot);
      this.head.add(pivot);
    }
    for (let i = 0; i < 5; i++) {
      const pivot = new Group();
      pivot.rotation.y = (i / 5) * Math.PI * 2 + 0.4;
      pivot.add(new Mesh(innerGeo, this.innerMat));
      pivot.position.y = 0.015;
      this.inner.push(pivot);
      this.head.add(pivot);
    }
    this.head.add(new Mesh(coreGeo, this.coreMat));

    this.glow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: this.target, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    this.glow.scale.setScalar(1.1);
    this.head.add(this.glow);

    this.head.position.set(bend, h, 0);
    this.head.rotation.x = 0.35; // tilt the face towards the viewer side
    this.proxy = new Mesh(proxyGeo, new MeshBasicMaterial({ visible: false }));
    this.proxy.position.copy(this.head.position);

    this.group.add(stem, this.head, this.proxy);
    this.group.position.copy(pos);
    this.group.scale.setScalar(1.6);
    this.group.rotation.y = range(rand, -0.5, 0.5);
    this.applyOpen();
  }

  setHover(on: boolean): void {
    gsap.to(this.state, { hover: on ? 1 : 0, duration: 0.35, ease: "sine.out", overwrite: "auto" });
  }

  bloom(): void {
    if (this.bloomed) return;
    this.bloomed = true;
    gsap
      .timeline()
      .to(this.state, { open: 1, duration: 1.6, ease: "elastic.out(1, 0.55)", onUpdate: () => this.applyOpen() })
      .to(this.state, { flash: 1, duration: 0.25, ease: "sine.out" }, 0)
      .to(this.state, { flash: 0, duration: 1.4, ease: "sine.inOut" }, 0.35);
  }

  /** Blooms instantly (used when revisiting). */
  setBloomed(): void {
    this.bloomed = true;
    this.state.open = 1;
    this.applyOpen();
  }

  private applyOpen(): void {
    const o = this.state.open;
    this.outer.forEach((p) => (p.children[0].rotation.x = -1.3 + o * 1.05));
    this.inner.forEach((p) => (p.children[0].rotation.x = -1.45 + o * 0.75));
    const c = Math.min(1, Math.max(0, o));
    this.petalMat.color.copy(this.target).lerp(PALE, 0.65 * (1 - c));
    this.innerMat.color.copy(this.target).lerp(PALE, 0.4 * (1 - c)).lerp(new Color("#FFFFFF"), 0.25 * c);
    this.petalMat.emissiveIntensity = 0.1 * c;
    this.innerMat.emissiveIntensity = 0.16 * c;
    this.coreMat.emissiveIntensity = 0.15 + 1.6 * c;
    this.head.scale.setScalar(0.85 + 0.15 * c);
  }

  update(t: number, motion: number): void {
    const { hover, flash, open } = this.state;
    this.group.rotation.z = Math.sin(t * 1.1 + this.phase) * 0.05 * motion;
    this.head.rotation.z = Math.sin(t * 0.8 + this.phase) * 0.08 * motion;
    const s = (0.85 + 0.15 * Math.min(1, open)) * (1 + hover * 0.12);
    this.head.scale.setScalar(s);
    this.glow.material.opacity = hover * 0.35 + flash * 0.9 + (this.bloomed ? 0.22 + 0.06 * Math.sin(t * 2 + this.phase) : 0);
  }
}

/** The twelve wish flowers in the middle of the garden island. */
export class WishGarden {
  readonly group = new Group();
  readonly flowers: WishFlower[];

  constructor(island: Island, spots: Vector3[], tones?: readonly string[]) {
    const rand = createRand(4242);
    this.flowers = spots.map((s, i) => {
      const p = s.clone();
      p.y = island.heightAt(p.x, p.z) - 0.02;
      return new WishFlower(p, i, rand, tones);
    });
    this.group.add(...this.flowers.map((f) => f.group));
  }

  get bloomedCount(): number {
    return this.flowers.filter((f) => f.bloomed).length;
  }

  /** The unbloomed flower closest to the middle, for the keyboard "bloom a flower" button. */
  nextUnbloomed(): WishFlower | undefined {
    return this.flowers.filter((f) => !f.bloomed).sort((a, b) => a.group.position.distanceTo(SPOT.gardenCenter) - b.group.position.distanceTo(SPOT.gardenCenter))[0];
  }

  update(t: number, motion: number): void {
    this.flowers.forEach((f) => f.update(t, motion));
  }
}
