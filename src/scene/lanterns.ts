import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { range, type Rand } from "../util/random";
import { C } from "@edition/palette";

interface Lantern {
  group: Group;
  rotor: Group;
  base: Vector3;
  phase: number;
}

/**
 * Tiny hovering "sun lantern" gadgets: a glowing orb in a gold ring, kept aloft by a
 * little spinning rotor. They drift lazily around the islands.
 */
export class Lanterns {
  readonly group = new Group();
  private readonly lanterns: Lantern[] = [];

  constructor(spots: Vector3[], rand: Rand) {
    const orbGeo = new SphereGeometry(0.15, 24, 16);
    const ringGeo = new TorusGeometry(0.175, 0.016, 8, 32);
    const capGeo = new CylinderGeometry(0.05, 0.07, 0.05, 16);
    const mastGeo = new CylinderGeometry(0.008, 0.008, 0.08, 6);
    const bladeGeo = new BoxGeometry(0.28, 0.006, 0.035);
    const orbMat = new MeshStandardMaterial({ color: C.ivory, emissive: "#FFDB8A", emissiveIntensity: 1.6, roughness: 0.3 });
    const goldMat = new MeshStandardMaterial({ color: C.gold, roughness: 0.35, metalness: 0.55 });
    const bladeMat = new MeshStandardMaterial({ color: C.ivory, roughness: 0.5 });

    for (const base of spots) {
      const group = new Group();
      const ring = new Mesh(ringGeo, goldMat);
      ring.rotation.x = Math.PI / 2;
      const cap = new Mesh(capGeo, goldMat);
      cap.position.y = 0.16;
      const mast = new Mesh(mastGeo, goldMat);
      mast.position.y = 0.22;
      const rotor = new Group();
      rotor.position.y = 0.26;
      const b1 = new Mesh(bladeGeo, bladeMat);
      const b2 = new Mesh(bladeGeo, bladeMat);
      b2.rotation.y = Math.PI / 2;
      rotor.add(b1, b2);
      group.add(new Mesh(orbGeo, orbMat), ring, cap, mast, rotor);
      group.position.copy(base);
      group.scale.setScalar(range(rand, 0.9, 1.2));
      this.group.add(group);
      this.lanterns.push({ group, rotor, base, phase: rand() * Math.PI * 2 });
    }
  }

  update(t: number, dt: number, motion: number): void {
    for (const l of this.lanterns) {
      l.group.position.set(
        l.base.x + Math.sin(t * 0.3 + l.phase) * 0.3 * motion,
        l.base.y + Math.sin(t * 0.9 + l.phase) * 0.15 * motion,
        l.base.z + Math.cos(t * 0.25 + l.phase) * 0.3 * motion,
      );
      l.group.rotation.z = Math.sin(t * 0.7 + l.phase) * 0.06 * motion;
      l.rotor.rotation.y += dt * 14;
    }
  }
}
