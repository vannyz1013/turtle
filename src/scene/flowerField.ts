import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeAll, paint, paintGradient } from "../util/geometry";
import { pick, range, type Rand } from "../util/random";
import { C, FLOWER_TONES } from "@edition/palette";
import { patchFoliage } from "./windShader";

export interface FieldPoint {
  x: number;
  y: number;
  z: number;
}

const STEM_H = 0.32;

function stemGeometry(): BufferGeometry {
  const stem = paint(new CylinderGeometry(0.008, 0.012, STEM_H, 5).translate(0, STEM_H / 2, 0), C.deepSage);
  const leaf = paint(new SphereGeometry(0.05, 6, 4).scale(0.45, 0.12, 1).translate(0, 0, 0.045), "#9DB48F");
  leaf.rotateX(-0.5).translate(0, 0.1, 0);
  const leaf2 = paint(new SphereGeometry(0.045, 6, 4).scale(0.45, 0.12, 1).translate(0, 0, 0.04), "#9DB48F");
  leaf2.rotateX(-0.6).rotateY(Math.PI).translate(0, 0.16, 0);
  const center = paint(new SphereGeometry(0.03, 8, 6).translate(0, STEM_H + 0.01, 0), "#F2C760");
  return mergeAll([stem, leaf, leaf2, center]);
}

function daisyHead(): BufferGeometry {
  const petals: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const p = new SphereGeometry(0.05, 8, 5).scale(0.55, 0.22, 1).translate(0, 0, 0.055);
    p.rotateX(-0.25).rotateY((i / 6) * Math.PI * 2);
    petals.push(paint(p, "#FFFFFF"));
  }
  return mergeAll(petals).translate(0, STEM_H, 0);
}

function tulipHead(): BufferGeometry {
  const profile = [
    new Vector2(0.0, -0.01),
    new Vector2(0.045, 0.0),
    new Vector2(0.07, 0.04),
    new Vector2(0.068, 0.09),
    new Vector2(0.05, 0.125),
  ];
  const g = new LatheGeometry(profile, 9);
  paintGradient(g, "#E8E8E8", "#FFFFFF", 0, 0.12);
  return mergeAll([g]).translate(0, STEM_H - 0.01, 0);
}

function grassTuft(): BufferGeometry {
  const blades: BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const h = 0.22 + i * 0.03;
    const b = new ConeGeometry(0.022, h, 3, 1).translate(0, h / 2, 0);
    b.rotateZ((i % 2 ? 1 : -1) * (0.15 + i * 0.06)).rotateY(i * 1.7);
    b.translate(Math.cos(i * 2.1) * 0.03, 0, Math.sin(i * 2.1) * 0.03);
    blades.push(paintGradient(b, C.deepSage, "#C9D8B4", 0, h));
  }
  return mergeAll(blades);
}

/**
 * The carpet of small flowers and grass on an island, as a handful of instanced meshes.
 * Everything sways in the wind; on the garden island colourfulness follows `bloom`.
 */
export function createFlowerField(
  flowers: FieldPoint[],
  grass: FieldPoint[],
  rand: Rand,
  bloom: { value: number },
): Group {
  const group = new Group();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();
  const color = new Color();

  const matrices = (pts: FieldPoint[], scale: [number, number]): Matrix4[] =>
    pts.map((pt) => {
      e.set(range(rand, -0.12, 0.12), rand() * Math.PI * 2, range(rand, -0.12, 0.12));
      q.setFromEuler(e);
      const k = range(rand, scale[0], scale[1]);
      return new Matrix4().compose(p.set(pt.x, pt.y - 0.02, pt.z), q, s.set(k, k, k));
    });

  const add = (mesh: InstancedMesh, list: Matrix4[]): void => {
    list.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Split flowers into daisies and tulips; both share one stem mesh (same transforms).
  const daisies: FieldPoint[] = [];
  const tulips: FieldPoint[] = [];
  flowers.forEach((f) => (rand() < 0.68 ? daisies : tulips).push(f));
  const daisyM = matrices(daisies, [0.8, 1.35]);
  const tulipM = matrices(tulips, [0.8, 1.35]);

  const stemMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  patchFoliage(stemMat, { sway: 0.9, bloom });
  const headMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide });
  patchFoliage(headMat, { sway: 0.9, bloom });

  add(new InstancedMesh(stemGeometry(), stemMat, daisies.length + tulips.length), [...daisyM, ...tulipM]);

  const daisyMesh = new InstancedMesh(daisyHead(), headMat, daisies.length);
  daisies.forEach((_, i) => daisyMesh.setColorAt(i, color.set(pick(rand, FLOWER_TONES))));
  add(daisyMesh, daisyM);

  const tulipMesh = new InstancedMesh(tulipHead(), headMat, tulips.length);
  tulips.forEach((_, i) => tulipMesh.setColorAt(i, color.set(pick(rand, [C.pink, C.rose, C.yellow, C.lilac, C.peach]))));
  add(tulipMesh, tulipM);

  const grassMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  patchFoliage(grassMat, { sway: 1.6, bloom });
  add(new InstancedMesh(grassTuft(), grassMat, grass.length), matrices(grass, [0.7, 1.4]));

  return group;
}
