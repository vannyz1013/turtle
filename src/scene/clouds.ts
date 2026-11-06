import { BufferGeometry, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial } from "three";
import { mergeAll, paintGradient, wobble } from "../util/geometry";
import { range, type Rand } from "../util/random";

interface Drifter {
  mesh: Mesh;
  speed: number;
  bob: number;
  baseY: number;
}

const BOUNDS = { minX: -90, maxX: 140 };

/** One fluffy cloud: a cluster of soft spheres with a flattened, shaded underside. */
function cloudGeometry(rand: Rand, puffs: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const r = range(rand, 0.7, 1.35) * (i === 0 ? 1.3 : 1);
    const g = new IcosahedronGeometry(r, 3);
    wobble(g, 0.05, i * 3.1);
    const t = puffs === 1 ? 0 : i / (puffs - 1) - 0.5;
    g.translate(t * puffs * 0.95 + range(rand, -0.2, 0.2), range(rand, -0.1, 0.45) * r, range(rand, -0.5, 0.5));
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) if (pos.getY(k) < -0.15) pos.setY(k, -0.15 + (pos.getY(k) + 0.15) * 0.35);
    g.computeVertexNormals();
    parts.push(g);
  }
  const merged = mergeAll(parts);
  paintGradient(merged, "#D9E6EE", "#FFFFFF", -0.4, 1.4);
  return merged;
}

/** Drifting clouds around the islands, and a soft sea of clouds below them. */
export class Clouds {
  readonly group = new Group();
  private readonly drifters: Drifter[] = [];
  private readonly material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    emissive: "#FFF4EA",
    emissiveIntensity: 0.12,
  });

  constructor(rand: Rand) {
    const shapes = [cloudGeometry(rand, 5), cloudGeometry(rand, 4), cloudGeometry(rand, 6), cloudGeometry(rand, 3)];

    // Floating clouds at island height.
    for (let i = 0; i < 18; i++) {
      const m = new Mesh(shapes[i % shapes.length], this.material);
      const s = range(rand, 1.2, 2.6);
      m.scale.set(s * range(rand, 1, 1.4), s, s);
      m.position.set(range(rand, BOUNDS.minX, BOUNDS.maxX), range(rand, -6, 14), range(rand, -85, 30));
      // Keep clear of the paths the camera flies.
      if (Math.abs(m.position.y) < 4 && m.position.z > -50 && m.position.x > -10 && m.position.x < 60) m.position.y += 12;
      // ...and out of the opening view, which looks from (19, 11, 33) towards the welcome island.
      const t = Math.max(0, Math.min(1, (m.position.x * 19 + m.position.y * 11 + m.position.z * 33) / (19 * 19 + 11 * 11 + 33 * 33)));
      if (Math.hypot(m.position.x - 19 * t, m.position.y - 11 * t, m.position.z - 33 * t) < 14) m.position.z -= 40;
      this.add(m, range(rand, 0.25, 0.6), rand);
    }

    // The cloud sea far below.
    for (let i = 0; i < 26; i++) {
      const m = new Mesh(shapes[i % shapes.length], this.material);
      const s = range(rand, 4, 7);
      m.scale.set(s * 1.4, s * 0.8, s);
      m.position.set(range(rand, BOUNDS.minX, BOUNDS.maxX), range(rand, -26, -19), range(rand, -110, 40));
      this.add(m, range(rand, 0.15, 0.35), rand);
    }
  }

  private add(mesh: Mesh, speed: number, rand: Rand): void {
    mesh.rotation.y = range(rand, -0.4, 0.4);
    this.group.add(mesh);
    this.drifters.push({ mesh, speed, bob: rand() * 6.28, baseY: mesh.position.y });
  }

  update(t: number, dt: number, motion: number): void {
    for (const d of this.drifters) {
      const p = d.mesh.position;
      p.x += d.speed * dt * motion;
      if (p.x > BOUNDS.maxX) p.x = BOUNDS.minX;
      p.y = d.baseY + Math.sin(t * 0.2 + d.bob) * 0.25 * motion;
    }
  }
}
