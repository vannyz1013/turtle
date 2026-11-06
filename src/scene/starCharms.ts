import { Euler, ExtrudeGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { starShape } from "../util/shapes";
import { range, type Rand } from "../util/random";
import { C } from "@edition/palette";

interface Charm {
  base: Vector3;
  phase: number;
  spin: number;
  scale: number;
}

/** Small glowing stars that hang in the air around the islands, slowly turning. */
export class StarCharms {
  readonly mesh: InstancedMesh;
  private readonly charms: Charm[];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly e = new Euler();
  private readonly p = new Vector3();
  private readonly s = new Vector3();

  constructor(spots: Vector3[], rand: Rand) {
    const geo = new ExtrudeGeometry(starShape(0.16, 0.075), {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.028,
      bevelSegments: 3,
      curveSegments: 1,
    });
    geo.center();
    const mat = new MeshStandardMaterial({
      color: C.yellow,
      emissive: "#FFD978",
      emissiveIntensity: 1.7,
      roughness: 0.35,
      metalness: 0.1,
    });
    this.mesh = new InstancedMesh(geo, mat, spots.length);
    this.mesh.frustumCulled = false;
    this.charms = spots.map((base) => ({
      base,
      phase: rand() * Math.PI * 2,
      spin: range(rand, 0.3, 0.7) * (rand() < 0.5 ? -1 : 1),
      scale: range(rand, 0.7, 1.25),
    }));
    this.update(0, 1);
  }

  update(t: number, motion: number): void {
    this.charms.forEach((c, i) => {
      this.p.copy(c.base);
      this.p.y += Math.sin(t * 0.8 + c.phase) * 0.18 * motion;
      this.e.set(Math.sin(t * 0.5 + c.phase) * 0.25, t * c.spin * motion + c.phase, 0);
      this.q.setFromEuler(this.e);
      this.m.compose(this.p, this.q, this.s.setScalar(c.scale));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
