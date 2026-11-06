import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { mergeAll, paint, shade, wobble } from "../util/geometry";
import { pick, range, type Rand } from "../util/random";
import type { Island } from "./island";
import { C } from "@edition/palette";
import { patchFoliage } from "./windShader";

export interface TreeSpot {
  angle: number;
  /** 0..1 distance from centre. */
  rn: number;
  scale: number;
  blossom?: boolean;
}

export interface DecorSpec {
  trees: TreeSpot[];
  rocks: number;
  /** Local (x, z) positions of stepping stones. */
  stones?: Array<[number, number]>;
  /** Keep rocks out of these spots (local x, z) → true to skip. */
  avoid?: (lx: number, lz: number) => boolean;
}

const LEAF_TONES = [C.sage, "#B4C7A2", "#9DB28F", "#C1D0AE"];
const BLOSSOM_TONES = [C.pink, "#F2CDCB", "#EDB5BB"];

/** A round, soft-canopied tree: a tapered trunk and a few wobbly foliage puffs. */
function tree(rand: Rand, scale: number, blossom: boolean): { trunk: BufferGeometry; leaves: BufferGeometry[] } {
  const h = range(rand, 1.1, 1.6) * scale;
  const trunk = new CylinderGeometry(0.07 * scale, 0.13 * scale, h, 8);
  trunk.translate(0, h / 2, 0);
  paint(trunk, C.trunk);

  const leaves: BufferGeometry[] = [];
  const n = 3 + Math.floor(rand() * 2);
  const tones = blossom ? BLOSSOM_TONES : LEAF_TONES;
  for (let i = 0; i < n; i++) {
    const r = range(rand, 0.48, 0.75) * scale * (i === 0 ? 1.15 : 1);
    const g = new IcosahedronGeometry(r, 2);
    wobble(g, 0.06 * r, i + scale * 7);
    shade(g, pick(rand, tones), 0.72);
    const spread = i === 0 ? 0 : 0.42;
    g.translate(range(rand, -spread, spread) * scale, h + range(rand, -0.05, 0.4) * scale, range(rand, -spread, spread) * scale);
    leaves.push(g);
  }
  return { trunk, leaves };
}

function rock(rand: Rand): BufferGeometry {
  const r = range(rand, 0.12, 0.32);
  const g = new DodecahedronGeometry(r, 0);
  g.scale(range(rand, 1, 1.5), range(rand, 0.55, 0.8), range(rand, 1, 1.3));
  g.rotateY(rand() * Math.PI);
  shade(g, new Color(C.stone).lerp(new Color(C.rock), rand() * 0.4), 0.8);
  g.translate(0, r * 0.25, 0);
  return g;
}

/**
 * Trees, rocks and stepping stones for one island, merged into two draw calls
 * (solid things and foliage). Foliage sways gently in the wind.
 */
export function buildDecor(island: Island, spec: DecorSpec, rand: Rand, bloom?: { value: number }): Group {
  const group = new Group();
  group.position.copy(island.spec.center);
  const solids: BufferGeometry[] = [];
  const foliage: BufferGeometry[] = [];

  for (const t of spec.trees) {
    const r = island.radiusAt(t.angle) * t.rn;
    const lx = Math.cos(t.angle) * r;
    const lz = Math.sin(t.angle) * r;
    const y = island.heightLocal(lx, lz) - 0.05;
    const { trunk, leaves } = tree(rand, t.scale, !!t.blossom);
    const spin = rand() * Math.PI * 2;
    for (const g of [trunk, ...leaves]) g.rotateY(spin).translate(lx, y, lz);
    solids.push(trunk);
    foliage.push(...leaves);
  }

  for (let i = 0, tries = 0; i < spec.rocks && tries < spec.rocks * 20; tries++) {
    const a = rand() * Math.PI * 2;
    const rn = range(rand, 0.35, 0.92);
    const r = island.radiusAt(a) * rn;
    const lx = Math.cos(a) * r;
    const lz = Math.sin(a) * r;
    if (spec.avoid?.(lx, lz)) continue;
    solids.push(rock(rand).translate(lx, island.heightLocal(lx, lz), lz));
    i++;
  }

  for (const [lx, lz] of spec.stones ?? []) {
    const r = range(rand, 0.26, 0.36);
    const g = new CylinderGeometry(r, r * 1.06, 0.07, 14);
    g.scale(1, 1, range(rand, 0.75, 0.95));
    g.rotateY(rand() * Math.PI);
    shade(g, C.stone, 0.85);
    solids.push(g.translate(lx, island.heightLocal(lx, lz) + 0.01, lz));
  }

  if (solids.length) {
    const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    if (bloom) patchFoliage(mat, { sway: 0, bloom });
    const m = new Mesh(mergeAll(solids), mat);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  if (foliage.length) {
    const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    patchFoliage(mat, { sway: 0.0035, bloom });
    const m = new Mesh(mergeAll(foliage), mat);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  return group;
}
