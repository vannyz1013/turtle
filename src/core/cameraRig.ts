import gsap from "gsap";
import { PerspectiveCamera, Vector2, Vector3 } from "three";
import type { Motion } from "./motion";

/** A camera position and the point it looks at, in landscape "design space". */
export interface Shot {
  pos: Vector3;
  target: Vector3;
  /**
   * Optional framing for portrait screens. Without it, portrait screens use the landscape
   * shot pulled back a little. With it, the camera blends to this exact position instead.
   */
  portrait?: { pos: Vector3; target: Vector3 };
}

type V3 = [number, number, number];

export const shot = (pos: V3, target: V3, portrait?: { pos: V3; target: V3 }): Shot => ({
  pos: new Vector3(...pos),
  target: new Vector3(...target),
  portrait: portrait && { pos: new Vector3(...portrait.pos), target: new Vector3(...portrait.target) },
});

/**
 * Moves the camera between shots with GSAP. On portrait screens it pulls back and widens
 * the lens so the same composition still fits; with a mouse it adds a gentle parallax.
 */
export class CameraRig {
  readonly pos = new Vector3();
  readonly target = new Vector3();
  /** Portrait override track, blended in by `blend.w` (0 = derived from landscape). */
  private readonly pPos = new Vector3();
  private readonly pTarget = new Vector3();
  private readonly blend = { w: 0 };
  private readonly look = new Vector3();

  private timeline: gsap.core.Timeline | null = null;
  private settle: (() => void) | null = null;
  private readonly pointer = new Vector2();
  private readonly smooth = new Vector2();
  private readonly v = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly motion: Motion,
  ) {
    window.addEventListener("pointermove", this.onPointer, { passive: true });
  }

  set(s: Shot): void {
    this.stop();
    this.pos.copy(s.pos);
    this.target.copy(s.target);
    if (s.portrait) {
      this.pPos.copy(s.portrait.pos);
      this.pTarget.copy(s.portrait.target);
    }
    this.blend.w = s.portrait ? 1 : 0;
  }

  /** Flies to a shot. Resolves when it arrives, or when another flight replaces it. */
  fly(s: Shot, duration: number, ease = "power2.inOut"): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      this.settle = resolve;
      // Start the portrait track where the camera currently is, so blending in is seamless.
      if (s.portrait && this.blend.w === 0) {
        this.pPos.copy(this.pulledBack(this.v));
        this.pTarget.copy(this.target);
      }
      const tl = gsap
        .timeline({ onComplete: () => this.finish() })
        .to(this.pos, { x: s.pos.x, y: s.pos.y, z: s.pos.z, duration, ease }, 0)
        .to(this.target, { x: s.target.x, y: s.target.y, z: s.target.z, duration, ease }, 0)
        .to(this.blend, { w: s.portrait ? 1 : 0, duration, ease }, 0);
      if (s.portrait) {
        const p = s.portrait;
        tl.to(this.pPos, { x: p.pos.x, y: p.pos.y, z: p.pos.z, duration, ease }, 0).to(
          this.pTarget,
          { x: p.target.x, y: p.target.y, z: p.target.z, duration, ease },
          0,
        );
      }
      this.timeline = tl;
    });
  }

  private finish(): void {
    const done = this.settle;
    this.settle = null;
    this.timeline = null;
    done?.();
  }

  private stop(): void {
    this.timeline?.kill();
    this.finish();
  }

  update(t: number, dt: number): void {
    const cam = this.camera;
    const aspect = cam.aspect;
    const portrait = aspect < 1;
    const fov = portrait ? 50 : 42;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    this.pulledBack(this.v);
    this.look.copy(this.target);
    if (portrait && this.blend.w > 0) {
      this.v.lerp(this.pPos, this.blend.w);
      this.look.lerp(this.pTarget, this.blend.w);
    }

    if (!this.motion.reduced) {
      this.smooth.lerp(this.pointer, 1 - Math.exp(-dt * 2.2));
      this.right.subVectors(this.look, this.v).normalize().cross(cam.up).normalize();
      this.up.copy(cam.up);
      const dist = this.v.distanceTo(this.look);
      const amp = Math.min(0.35, dist * 0.03);
      this.v.addScaledVector(this.right, this.smooth.x * amp);
      this.v.addScaledVector(this.up, this.smooth.y * amp * 0.5 + Math.sin(t * 0.35) * 0.04);
    }

    cam.position.copy(this.v);
    cam.lookAt(this.look);
  }

  /** The landscape shot, pulled back on tall screens so subjects keep a comfortable margin. */
  private pulledBack(out: Vector3): Vector3 {
    const aspect = this.camera.aspect;
    const k = aspect < 1 ? 1 + (1 - aspect) * 0.65 : 1;
    return out.copy(this.pos).sub(this.target).multiplyScalar(k).add(this.target);
  }

  private onPointer = (e: PointerEvent): void => {
    if (e.pointerType !== "mouse") return;
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };

  dispose(): void {
    this.stop();
    window.removeEventListener("pointermove", this.onPointer);
  }
}
