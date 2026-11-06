import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshStandardMaterial } from "three";
import type { IslandSpec } from "./layout";
import { C } from "@edition/palette";
import { smoothstep } from "../util/random";
import { patchFoliage } from "./windShader";

const SEG = 84;
const TOP_RINGS = 10;
const SIDE_RINGS = 16;

/**
 * A floating island: a gently rolling grassy top with a soft rounded rim, and a layered
 * earthy underside tapering to a point. Built procedurally with baked vertex colours.
 */
export class Island {
  readonly mesh: Mesh<BufferGeometry, MeshStandardMaterial>;

  constructor(
    readonly spec: IslandSpec,
    bloom?: { value: number },
  ) {
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    if (bloom) patchFoliage(material, { sway: 0, bloom });
    this.mesh = new Mesh(this.build(), material);
    this.mesh.position.copy(spec.center);
    this.mesh.receiveShadow = true;
  }

  /** Radius of the coastline at an angle (local space). */
  radiusAt(angle: number): number {
    const s = this.spec.seed;
    return (
      this.spec.radius *
      (1 + 0.055 * Math.sin(3 * angle + s) + 0.035 * Math.sin(5 * angle + s * 1.7) + 0.02 * Math.sin(9 * angle + s * 0.3))
    );
  }

  /** Normalised distance from centre: 0 at the middle, 1 at the coast. */
  radial(lx: number, lz: number): number {
    return Math.hypot(lx, lz) / this.radiusAt(Math.atan2(lz, lx));
  }

  heightLocal(lx: number, lz: number): number {
    const s = this.spec.seed;
    const rn = this.radial(lx, lz);
    const hills = 0.16 * Math.sin(lx * 0.42 + s) * Math.cos(lz * 0.37 + s * 1.3) + 0.05 * Math.sin(lx * 1.1 + lz * 0.9 + s * 2.1);
    const dome = 0.18 * Math.max(0, 1 - rn * rn);
    return (hills + dome) * (1 - smoothstep(0.72, 1.0, rn));
  }

  /** World-space ground height. */
  heightAt(x: number, z: number): number {
    return this.spec.center.y + this.heightLocal(x - this.spec.center.x, z - this.spec.center.z);
  }

  /** Whether a world point is on the island, `margin` (0..1) away from the coast. */
  contains(x: number, z: number, margin = 0.9): boolean {
    return this.radial(x - this.spec.center.x, z - this.spec.center.z) < margin;
  }

  private build(): BufferGeometry {
    const { depth, seed } = this.spec;
    const rows: Array<{ rn: number; y: (lx: number, lz: number, a: number) => number; color: (a: number, out: Color) => Color }> = [];
    const grassA = new Color(C.sage);
    const grassB = new Color("#B7C9A6");
    const lip = new Color(C.deepSage);
    const soil = new Color(C.soil);
    const soilDeep = new Color(C.soilDeep);
    const rock = new Color(C.rock);

    for (let k = 0; k <= TOP_RINGS; k++) {
      const rn = Math.pow(k / TOP_RINGS, 0.75);
      rows.push({
        rn,
        y: (lx, lz) => this.heightLocal(lx, lz),
        color: (a, out) => out.lerpColors(grassA, grassB, 0.5 + 0.5 * Math.sin(a * 5 + rn * 7 + seed)).multiplyScalar(1.02 - rn * 0.06),
      });
    }
    // Rounded grassy rim.
    rows.push({ rn: 1.012, y: () => -0.07, color: (_a, out) => out.copy(grassA).lerp(lip, 0.5) });
    rows.push({ rn: 1.02, y: () => -0.2, color: (_a, out) => out.copy(lip) });
    // Earthy underside, in soft layers.
    for (let k = 1; k <= SIDE_RINGS; k++) {
      const t = k / SIDE_RINGS;
      const shrink = Math.max(0.02, 1 - Math.pow(t, 1.45));
      rows.push({
        rn: 1.02 * shrink,
        y: (_lx, _lz, a) => -0.2 - depth * t + Math.sin(a * 4 + seed) * 0.15 * t,
        color: (a, out) => {
          const c = t < 0.5 ? out.lerpColors(soil, soilDeep, t * 2) : out.lerpColors(soilDeep, rock, (t - 0.5) * 2);
          return c.multiplyScalar(0.95 + 0.06 * Math.sin(t * 22 + a * 2 + seed));
        },
      });
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const col = new Color();
    rows.forEach((row, ri) => {
      const sideT = ri > TOP_RINGS + 2 ? (ri - TOP_RINGS - 2) / SIDE_RINGS : 0;
      for (let j = 0; j < SEG; j++) {
        const a = (j / SEG) * Math.PI * 2;
        const bump = 1 + 0.07 * Math.sin(a * 6 + sideT * 9 + seed) * Math.sin(sideT * Math.PI);
        const r = this.radiusAt(a) * row.rn * bump;
        const lx = Math.cos(a) * r;
        const lz = Math.sin(a) * r;
        positions.push(lx, row.y(lx, lz, a), lz);
        row.color(a, col);
        colors.push(col.r, col.g, col.b);
      }
    });

    const index: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * SEG + j;
        const b = i * SEG + ((j + 1) % SEG);
        const c = (i + 1) * SEG + j;
        const d = (i + 1) * SEG + ((j + 1) % SEG);
        index.push(a, b, c, b, d, c);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }
}
