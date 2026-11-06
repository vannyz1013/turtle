import gsap from "gsap";
import {
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Camera,
} from "three";
import type { AssetLicence, Companion } from "../core/edition";

export interface GltfCompanionOptions {
  /** URL of a .glb/.gltf file the edition is licensed to use. */
  url: string;
  /**
   * The permission for this model. Required so that no model can be wired in without a
   * written record of who allowed it and for what. Original models list their author.
   */
  licence: AssetLicence;
  /** Height the model is scaled to, in world units (Sunny is about 1.3). */
  height?: number;
  /** Lift above the ground (for floating characters). */
  hover?: number;
  /** Extra yaw if the model does not face +Z. */
  yawOffset?: number;
  /** Animation clip names in the file. Missing clips fall back to gentle procedural motion. */
  clips?: { idle?: string; wave?: string; react?: string; happy?: string };
  /** Reduced-motion preference. */
  motion: { readonly reduced: boolean; readonly amount: number };
}

/**
 * A guide character loaded from a glTF model, implementing the same Companion contract
 * as Sunny. This is the integration point for officially licensed character assets in
 * private editions: it contains no character itself, only the plumbing.
 *
 * GLTFLoader is imported on demand, so editions that never use this add nothing to their bundle.
 */
export class GltfCompanion implements Companion {
  readonly root = new Group();
  readonly speechAnchor = new Object3D();
  readonly proxy: Mesh;

  private readonly body = new Group();
  private readonly mixer: AnimationMixer;
  private readonly actions: Partial<Record<"idle" | "wave" | "react" | "happy", AnimationAction>> = {};
  private facing: Vector3 | null = null;
  private yaw = 0;
  private readonly bob = { y: 0 };
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();

  private constructor(
    model: Object3D,
    clips: AnimationClip[],
    private readonly opts: GltfCompanionOptions,
  ) {
    // Normalise: scale to the requested height, feet on the ground, centred.
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const height = opts.height ?? 1.3;
    const k = size.y > 0 ? height / size.y : 1;
    model.scale.multiplyScalar(k);
    box.setFromObject(model);
    const center = box.getCenter(new Vector3());
    model.position.sub(new Vector3(center.x, box.min.y, center.z));
    model.rotation.y += opts.yawOffset ?? 0;
    model.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = o.receiveShadow = true;
    });

    this.body.add(model);
    this.body.position.y = opts.hover ?? 0;
    this.speechAnchor.position.y = (opts.hover ?? 0) + height + 0.15;

    this.proxy = new Mesh(new SphereGeometry(Math.max(0.5, height * 0.5), 12, 8), new MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = (opts.hover ?? 0) + height * 0.5;

    this.root.add(this.body, this.speechAnchor, this.proxy);

    this.mixer = new AnimationMixer(model);
    for (const key of ["idle", "wave", "react", "happy"] as const) {
      const name = opts.clips?.[key];
      const clip = name ? clips.find((c) => c.name === name) : undefined;
      if (name && !clip) console.warn(`GltfCompanion: clip "${name}" not found in ${opts.url}`);
      if (clip) this.actions[key] = this.mixer.clipAction(clip);
    }
    this.actions.idle?.play();
    this.mixer.addEventListener("finished", () => this.actions.idle?.reset().fadeIn(0.25).play());
  }

  /** Loads the model. Fails loudly if the licence record is incomplete. */
  static async load(opts: GltfCompanionOptions): Promise<GltfCompanion> {
    const l = opts.licence;
    if (!l?.owner?.trim() || !l.licensee?.trim() || !l.reference?.trim() || !l.scope?.trim()) {
      throw new Error("GltfCompanion: a complete licence record (owner, licensee, reference, scope) is required.");
    }
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(opts.url);
    return new GltfCompanion(gltf.scene, gltf.animations, opts);
  }

  private playOnce(key: "wave" | "react" | "happy"): boolean {
    const action = this.actions[key];
    if (!action) return false;
    action.reset();
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = false;
    this.actions.idle?.fadeOut(0.2);
    action.fadeIn(0.2).play();
    return true;
  }

  teleport(ground: Vector3): void {
    gsap.killTweensOf(this.root.position);
    this.root.position.copy(ground);
  }

  moveTo(ground: Vector3, duration = 2.4): Promise<void> {
    const from = this.root.position.clone();
    const prog = { t: 0 };
    this.facing = ground.clone();
    gsap.killTweensOf(this.root.position);
    return new Promise((resolve) => {
      gsap.to(prog, {
        t: 1,
        duration: this.opts.motion.reduced ? Math.min(duration, 1.2) : duration,
        ease: "power1.inOut",
        onUpdate: () => {
          this.root.position.lerpVectors(from, ground, prog.t);
          this.root.position.y += Math.sin(prog.t * Math.PI) * 0.4;
        },
        onComplete: () => {
          this.facing = null;
          resolve();
        },
      });
    });
  }

  lookAt(point: Vector3 | null): void {
    this.facing = point ? point.clone() : null;
  }

  wave(): void {
    if (this.playOnce("wave")) return;
    gsap.fromTo(this.body.rotation, { z: 0 }, { z: 0.08, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" });
  }

  react(): void {
    this.playOnce("react");
    const lift = this.opts.motion.reduced ? 0.06 : 0.3;
    gsap.timeline().to(this.bob, { y: lift, duration: 0.3, ease: "power2.out" }).to(this.bob, { y: 0, duration: 0.5, ease: "bounce.out" });
  }

  setHappy(on: boolean): void {
    if (on) this.playOnce("happy");
  }

  update(time: number, delta: number, camera: Camera): void {
    this.mixer.update(delta);
    const idle = this.actions.idle ? 0 : Math.sin(time * 2) * 0.03 * this.opts.motion.amount;
    this.body.position.y = (this.opts.hover ?? 0) + this.bob.y + idle;

    const target = this.facing ?? camera.getWorldPosition(this.tmp2);
    this.root.getWorldPosition(this.tmp);
    const want = Math.atan2(target.x - this.tmp.x, target.z - this.tmp.z);
    let diff = want - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, delta * 3);
    this.body.rotation.y = this.yaw;
  }
}
