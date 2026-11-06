import { BufferGeometry, Color, Float32BufferAttribute, type ColorRepresentation } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const tmp = new Color();

/** Bakes one colour into a geometry's vertex colours. */
export function paint(geo: BufferGeometry, color: ColorRepresentation): BufferGeometry {
  return paintGradient(geo, color, color, 0, 1);
}

/**
 * Vertex colours that fade from `bottom` to `top` along local Y. A cheap way to fake
 * ambient occlusion: darker underneath, lighter where the sun reaches.
 */
export function paintGradient(
  geo: BufferGeometry,
  bottom: ColorRepresentation,
  top: ColorRepresentation,
  minY: number,
  maxY: number,
): BufferGeometry {
  const pos = geo.attributes.position;
  const out = new Float32Array(pos.count * 3);
  const a = new Color(bottom);
  const b = new Color(top);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - minY) / (maxY - minY || 1)));
    tmp.copy(a).lerp(b, t);
    out[i * 3] = tmp.r;
    out[i * 3 + 1] = tmp.g;
    out[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(out, 3));
  return geo;
}

/** Paints a colour that darkens towards the bottom of the geometry (soft self-shading). */
export function shade(geo: BufferGeometry, color: ColorRepresentation, darkBelow = 0.78): BufferGeometry {
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const top = new Color(color);
  const bottom = top.clone().multiplyScalar(darkBelow);
  return paintGradient(geo, bottom, top, box.min.y, box.max.y);
}

/** Nudges vertices with smooth position-based noise; identical positions move together, so no cracks. */
export function wobble(geo: BufferGeometry, amount: number, seed = 0): BufferGeometry {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 4.1 + seed) * Math.cos(y * 3.7 + seed * 1.3) +
      Math.sin(z * 5.3 + y * 2.1 + seed * 0.7) * 0.6;
    const len = Math.hypot(x, y, z) || 1;
    const k = 1 + (n * amount) / len;
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  pos.needsUpdate = true;
  return geo;
}

/** Merges painted geometries into one draw call. Disposes the inputs. */
export function mergeAll(geos: BufferGeometry[]): BufferGeometry {
  const flat = geos.map((g) => {
    const f = g.index ? g.toNonIndexed() : g;
    if (f !== g) g.dispose();
    for (const name of Object.keys(f.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "color") f.deleteAttribute(name);
    }
    return f;
  });
  const merged = mergeGeometries(flat, false);
  flat.forEach((g) => g.dispose());
  if (!merged) throw new Error("mergeAll: incompatible geometries");
  merged.computeBoundingSphere();
  return merged;
}
