import gsap from "gsap";
import { Color, Fog, Group, Vector3, type PerspectiveCamera } from "three";
import type { Stage } from "../core/stage";
import { createRand, range, type Rand } from "../util/random";
import { nextFrame } from "../util/wait";
import { Butterflies } from "./butterflies";
import { Clouds } from "./clouds";
import { buildDecor, type TreeSpot } from "./decor";
import { createFlowerField, type FieldPoint } from "./flowerField";
import { Island } from "./island";
import { Lanterns } from "./lanterns";
import { ISLAND_A, ISLAND_B, ISLETS, SPOT } from "./layout";
import { Lights } from "./lights";
import { Motes } from "./motes";
import { Petals } from "./petals";
import { Sky } from "./sky";
import { SkyStars } from "./skyStars";
import { StarCharms } from "./starCharms";
import { windUniforms } from "./windShader";

const TREES_A: TreeSpot[] = [
  { angle: -2.6, rn: 0.78, scale: 1.25 },
  { angle: -1.25, rn: 0.8, scale: 1.1, blossom: true },
  { angle: -0.45, rn: 0.7, scale: 0.95 },
  { angle: 0.3, rn: 0.76, scale: 1.0, blossom: true },
  { angle: 2.85, rn: 0.72, scale: 1.05 },
  { angle: -1.95, rn: 0.88, scale: 0.8 },
];

const TREES_B: TreeSpot[] = [
  { angle: -2.8, rn: 0.78, scale: 1.3 },
  { angle: -2.2, rn: 0.84, scale: 1.1, blossom: true },
  { angle: -1.6, rn: 0.8, scale: 1.45 },
  { angle: -1.0, rn: 0.82, scale: 1.15, blossom: true },
  { angle: -0.4, rn: 0.78, scale: 1.25 },
  { angle: 0.3, rn: 0.82, scale: 1.0 },
  { angle: 2.8, rn: 0.8, scale: 1.05, blossom: true },
  { angle: 2.3, rn: 0.86, scale: 0.85 },
  { angle: -1.3, rn: 0.62, scale: 0.75 },
];

/** Stepping stones on the welcome island, from the shore to the door (local x, z). */
function pathA(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    out.push([1.6 + (-0.75 - 1.6) * t + Math.sin(t * Math.PI) * 0.7, 6.6 + (-1.0 - 6.6) * t]);
  }
  return out;
}

/** Stones on the garden island: shore → pocket → into the garden. */
function pathB(): Array<[number, number]> {
  return [
    [0.2, 10.4],
    [-0.15, 9.5],
    [0.25, 8.6],
    [1.5, 6.3],
    [1.7, 5.4],
    [1.3, 4.5],
    [0.9, 3.6],
  ];
}

export interface WorldBuild {
  /** Called with 0..1 as parts of the world are built. */
  report: (p: number) => void;
  /** Spots the wish flowers will occupy, so decorative flowers keep clear. */
  wishSpots: Vector3[];
  /** Edition override for finale petal colours. */
  petalColors?: readonly string[];
}

/**
 * The whole environment: sky, light, islands, plants, clouds and the little floating
 * details. Story chapters change its mood through `setGolden` and `setGardenBloom`.
 */
export class World {
  readonly group = new Group();
  readonly sky = new Sky();
  readonly lights: Lights;
  readonly islandA: Island;
  readonly islandB: Island;
  /** Colourfulness of the garden island, 0..1. */
  readonly gardenBloom = { value: 0.5 };
  readonly stars: SkyStars;
  readonly petals: Petals;
  readonly butterflies: Butterflies;

  private clouds!: Clouds;
  private motes!: Motes;
  private charms!: StarCharms;
  private lanterns!: Lanterns;
  private readonly golden = { value: 0 };
  private readonly fog: Fog;
  private readonly fogColor = new Color();
  private readonly camDir = new Vector3();

  private constructor(
    private readonly stage: Stage,
    rand: Rand,
    petalColors?: readonly string[],
  ) {
    this.lights = new Lights(stage.scene, stage.tier);
    this.islandA = new Island(ISLAND_A);
    this.islandB = new Island(ISLAND_B, this.gardenBloom);
    this.stars = new SkyStars(rand);
    this.petals = new Petals(rand, stage.tier === "low" ? 90 : 170, petalColors);
    this.butterflies = new Butterflies(
      [
        { center: new Vector3(0.5, 0, 1), radius: 3.5, count: 3, visible: 3 },
        { center: SPOT.gardenCenter.clone(), radius: 4.2, count: 12, visible: 2 },
      ],
      rand,
    );
    this.fog = new Fog(this.sky.horizon(new Color()), 80, 340);
    stage.scene.fog = this.fog;
    this.sky.group.add(this.stars.points);
    this.group.add(this.sky.group, this.islandA.mesh, this.islandB.mesh, this.petals.mesh, this.butterflies.group);
  }

  static async create(stage: Stage, build: WorldBuild): Promise<World> {
    const rand = createRand(20261106);
    const w = new World(stage, rand, build.petalColors);
    const low = stage.tier === "low";
    build.report(0.15);
    await nextFrame();

    // Islets.
    const islets = ISLETS.map((spec) => new Island(spec));
    islets.forEach((isle, i) => {
      w.group.add(isle.mesh);
      w.group.add(buildDecor(isle, { trees: [{ angle: i * 1.3, rn: 0.25, scale: range(rand, 0.65, 0.9), blossom: i % 3 === 1 }], rocks: 1 }, rand));
    });

    // Trees, rocks and paths.
    const doorL = { x: SPOT.door.x - ISLAND_A.center.x, z: SPOT.door.z - ISLAND_A.center.z };
    const stonesA = pathA();
    const stonesB = pathB();
    const nearStones = (stones: Array<[number, number]>, lx: number, lz: number, r: number) =>
      stones.some(([sx, sz]) => Math.hypot(sx - lx, sz - lz) < r);
    w.group.add(
      buildDecor(
        w.islandA,
        {
          trees: TREES_A,
          rocks: 7,
          stones: stonesA,
          avoid: (lx, lz) => nearStones(stonesA, lx, lz, 0.8) || Math.hypot(lx - doorL.x, lz - doorL.z) < 2,
        },
        rand,
      ),
    );
    const pocketL = { x: SPOT.pocket.x - ISLAND_B.center.x, z: SPOT.pocket.z - ISLAND_B.center.z };
    const gardenL = { x: SPOT.gardenCenter.x - ISLAND_B.center.x, z: SPOT.gardenCenter.z - ISLAND_B.center.z };
    w.group.add(
      buildDecor(
        w.islandB,
        {
          trees: TREES_B,
          rocks: 10,
          stones: stonesB,
          avoid: (lx, lz) =>
            nearStones(stonesB, lx, lz, 0.8) ||
            Math.hypot(lx - pocketL.x, lz - pocketL.z) < 2.2 ||
            Math.hypot(lx - gardenL.x, lz - gardenL.z) < 5,
        },
        rand,
        w.gardenBloom,
      ),
    );
    build.report(0.4);
    await nextFrame();

    // Flower carpets.
    const scatter = (island: Island, count: number, skip: (x: number, z: number) => boolean): FieldPoint[] => {
      const pts: FieldPoint[] = [];
      const c = island.spec.center;
      for (let tries = 0; pts.length < count && tries < count * 6; tries++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * island.radiusAt(a) * 0.93;
        const x = c.x + Math.cos(a) * r;
        const z = c.z + Math.sin(a) * r;
        if (skip(x, z)) continue;
        pts.push({ x, y: island.heightAt(x, z), z });
      }
      return pts;
    };
    const skipA = (x: number, z: number) =>
      nearStones(stonesA, x - ISLAND_A.center.x, z - ISLAND_A.center.z, 0.42) ||
      Math.hypot(x - SPOT.door.x, z - SPOT.door.z) < 1.5 ||
      Math.hypot(x - SPOT.robotWelcome.x, z - SPOT.robotWelcome.z) < 0.6;
    const skipB = (x: number, z: number) =>
      nearStones(stonesB, x - ISLAND_B.center.x, z - ISLAND_B.center.z, 0.42) ||
      Math.hypot(x - SPOT.pocket.x, z - SPOT.pocket.z) < 1.4 ||
      build.wishSpots.some((s) => Math.hypot(x - s.x, z - s.z) < 0.7);
    const scale = low ? 0.55 : 1;
    const isletFlowers = islets.flatMap((isle) => scatter(isle, Math.round(18 * scale), () => false));
    const isletGrass = islets.flatMap((isle) => scatter(isle, Math.round(30 * scale), () => false));
    w.group.add(
      createFlowerField(
        [...scatter(w.islandA, Math.round(190 * scale), skipA), ...isletFlowers],
        [...scatter(w.islandA, Math.round(560 * scale), skipA), ...isletGrass],
        rand,
        { value: 1 },
      ),
    );
    build.report(0.65);
    await nextFrame();
    w.group.add(
      createFlowerField(
        scatter(w.islandB, Math.round(480 * scale), skipB),
        scatter(w.islandB, Math.round(1300 * scale), skipB),
        rand,
        w.gardenBloom,
      ),
    );
    build.report(0.8);
    await nextFrame();

    // Air: clouds, glowing motes, star charms, lanterns.
    w.clouds = new Clouds(rand);
    w.motes = new Motes(
      [
        { center: new Vector3(0, -0.2, 0), size: new Vector3(16, 5, 16), count: low ? 60 : 140 },
        { center: new Vector3(46, -3.2, -40), size: new Vector3(22, 5, 22), count: low ? 90 : 220 },
      ],
      rand,
    );
    const charmSpots: Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const onA = i < 10;
      const c = onA ? ISLAND_A.center : ISLAND_B.center;
      const r = onA ? 9 : 13;
      const a = rand() * Math.PI * 2;
      charmSpots.push(new Vector3(c.x + Math.cos(a) * range(rand, 0.6, 1.1) * r, c.y + range(rand, 2.2, 5.5), c.z + Math.sin(a) * range(rand, 0.6, 1.1) * r));
    }
    w.charms = new StarCharms(charmSpots, rand);
    w.lanterns = new Lanterns(
      [
        new Vector3(-2.8, 2.4, -1.4),
        new Vector3(2.9, 2.7, -2.8),
        new Vector3(3.8, 2.0, 2.0),
        new Vector3(42.2, -0.5, -35),
        new Vector3(50.6, 0.1, -37.4),
        new Vector3(43, 0.5, -45),
        new Vector3(49.6, 0.9, -46.4),
      ],
      rand,
    );
    w.group.add(w.clouds.group, w.motes.points, w.charms.mesh, w.lanterns.group);
    build.report(1);
    return w;
  }

  /** Blends the sky, light and fog from daylight (0) to golden hour (1). */
  setGolden(g: number, duration = 0): Promise<void> {
    return new Promise((resolve) => {
      gsap.killTweensOf(this.golden);
      gsap.to(this.golden, {
        value: g,
        duration,
        ease: "sine.inOut",
        onUpdate: () => this.applyGolden(),
        onComplete: () => resolve(),
      });
      if (duration === 0) this.applyGolden();
    });
  }

  private applyGolden(): void {
    const g = this.golden.value;
    this.sky.setGolden(g);
    this.lights.setGolden(g);
  }

  setGardenBloom(v: number, duration = 1.6): void {
    gsap.to(this.gardenBloom, { value: v, duration, ease: "sine.out", overwrite: true });
  }

  setStars(opacity: number, duration: number): void {
    gsap.to(this.stars.uniforms.uOpacity, { value: opacity, duration, ease: "sine.inOut", overwrite: true });
  }

  setPetals(amount: number, duration: number): void {
    gsap.to(this.petals, { amount, duration, ease: "sine.inOut", overwrite: true });
  }

  update(t: number, dt: number, camera: PerspectiveCamera, motion: number): void {
    windUniforms.uTime.value = t;
    windUniforms.uWind.value = 0.4 + 0.6 * motion;
    this.sky.follow(camera);
    this.fog.color.copy(this.sky.horizon(this.fogColor));
    const pr = this.stage.currentPixelRatio;
    this.stars.update(t, pr);
    this.motes.update(t, pr, motion);
    this.clouds.update(t, dt, motion);
    this.charms.update(t, motion);
    this.lanterns.update(t, dt, motion);
    this.butterflies.update(t, dt, motion);
    camera.getWorldDirection(this.camDir);
    this.petals.update(dt, camera.position, this.camDir, motion);
  }
}
