import type { Vector2 } from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * Unreal bloom computed at a fraction of the screen resolution.
 *
 * The glow is a wide blur, so starting its mip chain at a lower resolution is barely
 * visible but saves most of the pass's fill-rate cost. The final blend still happens at
 * full resolution, so sharp edges stay sharp.
 */
export class ScaledBloomPass extends UnrealBloomPass {
  private lastW = 1;
  private lastH = 1;

  constructor(
    resolution: Vector2,
    strength: number,
    radius: number,
    threshold: number,
    private scale: number,
  ) {
    super(resolution, strength, radius, threshold);
  }

  override setSize(width: number, height: number): void {
    this.lastW = width;
    this.lastH = height;
    super.setSize(Math.max(2, Math.round(width * this.scale)), Math.max(2, Math.round(height * this.scale)));
  }

  /** Changes the bloom resolution scale (1 = original full-quality bloom). */
  setScale(scale: number): void {
    this.scale = scale;
    this.setSize(this.lastW, this.lastH);
  }
}
