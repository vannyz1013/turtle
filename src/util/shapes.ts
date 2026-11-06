import { Shape } from "three";

/** A door-like outline: straight sides with a round top. Base sits on y = 0. */
export function archShape(width: number, height: number, offsetX = 0): Shape {
  const r = width / 2;
  const s = new Shape();
  s.moveTo(offsetX - r, 0);
  s.lineTo(offsetX + r, 0);
  s.lineTo(offsetX + r, height - r);
  s.absarc(offsetX, height - r, r, 0, Math.PI, false);
  s.lineTo(offsetX - r, 0);
  return s;
}

/** A soft five-pointed star, centred on the origin. */
export function starShape(outer: number, inner: number, points = 5): Shape {
  const s = new Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}
