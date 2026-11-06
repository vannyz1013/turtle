import { CanvasTexture, SRGBColorSpace } from "three";

let glow: CanvasTexture | null = null;
let blob: CanvasTexture | null = null;

function radial(stops: Array<[number, string]>, size = 128): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Soft white glow, shared by every halo in the world. */
export function glowTexture(): CanvasTexture {
  glow ??= radial([
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,0.55)"],
    [0.6, "rgba(255,255,255,0.12)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  return glow;
}

/** Contact shadow under floating things. */
export function blobTexture(): CanvasTexture {
  blob ??= radial([
    [0, "rgba(70,80,90,0.6)"],
    [0.5, "rgba(70,80,90,0.25)"],
    [1, "rgba(70,80,90,0)"],
  ]);
  return blob;
}

export function disposeSharedTextures(): void {
  glow?.dispose();
  blob?.dispose();
  glow = blob = null;
}
