import {
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { pick, range, type Rand } from "../util/random";
import { C } from "@edition/palette";

interface Petal {
  offset: Vector3;
  vel: Vector3;
  rot: Euler;
  spin: Vector3;
  scale: number;
}

const BOX = new Vector3(22, 12, 22);
const DEFAULT_PETALS = [C.pink, C.pink, "#F6D3D3", C.ivory, C.yellow, "#F3B9C1"];

/**
 * Flower petals carried across the screen by the breeze. They live in a box that follows
 * the camera, so they stay in view however far the camera pulls back.
 */
export class Petals {
  readonly mesh: InstancedMesh;
  /** 0 = none, 1 = all petals drifting. */
  amount = 0;
  private readonly petals: Petal[] = [];
  private readonly center = new Vector3();
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();

  constructor(rand: Rand, count = 170, colors: readonly string[] = DEFAULT_PETALS) {
    const geo = new SphereGeometry(0.07, 7, 4);
    geo.scale(1, 0.12, 0.62);
    const mat = new MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.7,
      side: DoubleSide,
      emissive: "#FFE9E0",
      emissiveIntensity: 0.25,
    });
    this.mesh = new InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    const color = new Color();
    for (let i = 0; i < count; i++) {
      this.petals.push({
        offset: new Vector3(range(rand, -0.5, 0.5) * BOX.x, range(rand, -0.5, 0.5) * BOX.y, range(rand, -0.5, 0.5) * BOX.z),
        vel: new Vector3(range(rand, 0.5, 1.1), range(rand, -0.45, -0.15), range(rand, -0.25, 0.25)),
        rot: new Euler(rand() * 6, rand() * 6, rand() * 6),
        spin: new Vector3(range(rand, -2, 2), range(rand, -1.5, 1.5), range(rand, -2, 2)),
        scale: range(rand, 0.7, 1.4),
      });
      this.mesh.setColorAt(i, color.set(pick(rand, colors)));
    }
    this.mesh.count = 0;
  }

  update(dt: number, cameraPos: Vector3, cameraDir: Vector3, motion: number): void {
    const n = Math.round(this.petals.length * this.amount);
    this.mesh.count = n;
    if (n === 0) return;
    this.center.copy(cameraPos).addScaledVector(cameraDir, BOX.z * 0.45);
    for (let i = 0; i < n; i++) {
      const pt = this.petals[i];
      pt.offset.addScaledVector(pt.vel, dt * motion);
      // Wrap around the box.
      for (const axis of ["x", "y", "z"] as const) {
        const half = BOX[axis] / 2;
        if (pt.offset[axis] > half) pt.offset[axis] -= BOX[axis];
        if (pt.offset[axis] < -half) pt.offset[axis] += BOX[axis];
      }
      pt.rot.x += pt.spin.x * dt * motion;
      pt.rot.y += pt.spin.y * dt * motion;
      pt.rot.z += pt.spin.z * dt * motion;
      this.q.setFromEuler(pt.rot);
      this.m.compose(this.p.copy(this.center).add(pt.offset), this.q, this.s.setScalar(pt.scale));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
