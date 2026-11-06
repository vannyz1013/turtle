import {
  CapsuleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import { pick, range, type Rand } from "../util/random";
import { C } from "@edition/palette";

export interface ButterflyZone {
  center: Vector3;
  radius: number;
  count: number;
  /** How many are visible at the start. */
  visible: number;
}

interface Butterfly {
  group: Group;
  left: Mesh;
  right: Mesh;
  zone: number;
  center: Vector3;
  radius: number;
  height: number;
  phase: number;
  speed: number;
  size: number;
  appear: number;
  target: number;
}

function wingGeometry(): ShapeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.01);
  s.bezierCurveTo(0.05, 0.12, 0.2, 0.15, 0.22, 0.05);
  s.bezierCurveTo(0.23, -0.01, 0.16, -0.03, 0.1, -0.02);
  s.bezierCurveTo(0.16, -0.06, 0.15, -0.15, 0.07, -0.13);
  s.bezierCurveTo(0.03, -0.12, 0.01, -0.06, 0, -0.02);
  s.lineTo(0, 0.01);
  const g = new ShapeGeometry(s, 10);
  g.rotateX(-Math.PI / 2); // lie flat, extending along +x
  return g;
}

/** Butterflies fluttering in lazy loops; more of them arrive as the garden blooms. */
export class Butterflies {
  readonly group = new Group();
  private readonly flock: Butterfly[] = [];
  private readonly prev = new Vector3();
  private readonly next = new Vector3();

  constructor(zones: ButterflyZone[], rand: Rand) {
    const wing = wingGeometry();
    const body = new CapsuleGeometry(0.012, 0.07, 3, 6).rotateX(Math.PI / 2);
    const bodyMat = new MeshStandardMaterial({ color: "#7D6E7A", roughness: 0.6 });
    const wingMats = [C.pink, C.yellow, C.sky, C.lilac, C.peach].map(
      (c) => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.5, side: DoubleSide }),
    );

    zones.forEach((zone, zi) => {
      for (let i = 0; i < zone.count; i++) {
        const group = new Group();
        const mat = pick(rand, wingMats);
        const right = new Mesh(wing, mat);
        const left = new Mesh(wing, mat);
        left.scale.x = -1;
        group.add(new Mesh(body, bodyMat), left, right);
        this.group.add(group);
        const shown = i < zone.visible ? 1 : 0;
        this.flock.push({
          group,
          left,
          right,
          zone: zi,
          center: zone.center.clone().add(new Vector3(range(rand, -1, 1), 0, range(rand, -1, 1)).multiplyScalar(zone.radius * 0.4)),
          radius: range(rand, 0.5, 1) * zone.radius,
          height: range(rand, 0.5, 1.6),
          phase: rand() * 100,
          speed: range(rand, 0.18, 0.32),
          size: range(rand, 0.8, 1.25),
          appear: shown,
          target: shown,
        });
      }
    });
  }

  /** Sets how many butterflies are flying in a zone. */
  setVisible(zone: number, count: number): void {
    let i = 0;
    for (const b of this.flock) if (b.zone === zone) b.target = i++ < count ? 1 : 0;
  }

  private path(b: Butterfly, t: number, out: Vector3): Vector3 {
    const u = t * b.speed + b.phase;
    return out.set(
      b.center.x + Math.cos(u) * b.radius + Math.sin(u * 2.3) * 0.35,
      b.center.y + b.height + Math.sin(u * 1.7) * 0.35 + Math.sin(u * 5.1) * 0.06,
      b.center.z + Math.sin(u * 1.3) * b.radius * 0.8,
    );
  }

  update(t: number, dt: number, motion: number): void {
    const time = t * (0.4 + 0.6 * motion);
    for (const b of this.flock) {
      b.appear += (b.target - b.appear) * Math.min(1, dt * 1.5);
      b.group.visible = b.appear > 0.01;
      if (!b.group.visible) continue;
      this.path(b, time, this.prev);
      this.path(b, time + 0.08, this.next);
      b.group.position.copy(this.prev);
      b.group.lookAt(this.next);
      b.group.scale.setScalar(b.size * b.appear);
      const flap = Math.sin(t * (9 + b.speed * 12) + b.phase) * 0.95 * (0.5 + 0.5 * motion) + 0.25;
      b.right.rotation.z = flap;
      b.left.rotation.z = -flap;
    }
  }
}
