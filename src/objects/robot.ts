import gsap from "gsap";
import {
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Camera,
} from "three";
import type { Companion } from "../core/edition";
import type { Motion } from "../core/motion";
import { C } from "@edition/palette";
import { starShape } from "../util/shapes";
import { blobTexture } from "../util/textures";

const HOVER = 0.34;

/** An emissive colour bright enough to catch the bloom. */
const glow = (hex: string, k: number) => new Color(hex).multiplyScalar(k);

/**
 * Sunny, the companion robot. An original design: a soft gumdrop-shaped body that floats
 * on a ring of light (no legs), a glossy screen face with glowing eyes, little ear-pods,
 * stubby floating arms, and a tiny star on its antenna.
 */
export class Robot implements Companion {
  readonly root = new Group();
  /** Where speech bubbles attach. */
  readonly speechAnchor = new Object3D();
  readonly proxy: Mesh;

  private readonly lift = new Group();
  private readonly body = new Group();
  private readonly eyes = new Group();
  private readonly happyEyes = new Group();
  private readonly armL = new Group();
  private readonly armR = new Group();
  private readonly star: Mesh;
  private readonly ring: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly shadow: Mesh<CircleGeometry, MeshBasicMaterial>;

  private yaw = 0;
  /** Height of the current travel arc, so the contact shadow can stay on the ground. */
  private arc = 0;
  private facing: Vector3 | null = null;
  private busy = false;
  private waving = false;
  private nextBlink = 2;
  private readonly jump = { y: 0, spin: 0 };
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();

  constructor(private readonly motion: Motion) {
    const blue = new MeshPhysicalMaterial({
      color: C.robotBlue,
      roughness: 0.32,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    });
    const ivory = new MeshStandardMaterial({ color: C.ivory, roughness: 0.45 });
    const yellow = new MeshStandardMaterial({ color: C.yellow, roughness: 0.4 });

    // Gumdrop body: wider at the bottom, softly domed on top.
    const profile = [
      [0, 0],
      [0.22, 0.012],
      [0.37, 0.07],
      [0.455, 0.19],
      [0.47, 0.34],
      [0.445, 0.5],
      [0.385, 0.63],
      [0.29, 0.73],
      [0.16, 0.79],
      [0, 0.805],
    ].map(([x, y]) => new Vector2(x, y));
    const shell = new Mesh(new LatheGeometry(profile, 56), blue);
    shell.castShadow = true;

    // Screen face.
    const screen = new Mesh(
      new SphereGeometry(1, 40, 24),
      new MeshPhysicalMaterial({ color: "#26334F", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    );
    screen.scale.set(0.29, 0.21, 0.13);
    screen.position.set(0, 0.45, 0.335);
    const rim = new Mesh(new TorusGeometry(1, 0.075, 12, 48), ivory);
    rim.scale.set(0.3, 0.22, 0.25);
    rim.position.set(0, 0.45, 0.35);

    // Eyes live on the screen surface.
    const eyeMat = new MeshBasicMaterial({ color: glow("#C9F4FF", 2.2), toneMapped: false });
    const eyeGeo = new CircleGeometry(0.042, 24);
    const sparkGeo = new CircleGeometry(0.012, 12);
    const sparkMat = new MeshBasicMaterial({ color: glow("#FFFFFF", 3), toneMapped: false });
    for (const side of [-1, 1]) {
      const eye = new Mesh(eyeGeo, eyeMat);
      eye.scale.set(0.82, 1.15, 1);
      eye.position.set(side * 0.098, 0, 0.462);
      eye.rotation.y = side * 0.32;
      const spark = new Mesh(sparkGeo, sparkMat);
      spark.position.set(side * 0.098 + 0.014, 0.023, 0.466);
      spark.rotation.y = side * 0.32;
      this.eyes.add(eye, spark);

      const happy = new Mesh(new TorusGeometry(0.036, 0.011, 8, 20, Math.PI), eyeMat);
      happy.position.set(side * 0.098, -0.015, 0.462);
      happy.rotation.y = side * 0.32;
      this.happyEyes.add(happy);

      // Digital blush.
      const blush = new Mesh(new CircleGeometry(0.03, 20), new MeshBasicMaterial({ color: glow(C.pink, 1.15), transparent: true, opacity: 0.85, toneMapped: false }));
      blush.scale.set(1.3, 0.75, 1);
      blush.position.set(side * 0.175, 0.405, 0.43);
      blush.rotation.y = side * 0.6;
      this.body.add(blush);
    }
    this.eyes.position.y = 0.465;
    this.happyEyes.position.y = 0.465;
    this.happyEyes.visible = false;

    const mouth = new Mesh(new TorusGeometry(0.026, 0.008, 8, 16, Math.PI), new MeshBasicMaterial({ color: glow("#FFD3D8", 1.6), toneMapped: false }));
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 0.395, 0.462);

    // Ear-pods: little ivory discs with yellow caps.
    for (const side of [-1, 1]) {
      const pod = new Mesh(new CylinderGeometry(0.105, 0.105, 0.075, 28), ivory);
      pod.rotation.z = Math.PI / 2;
      pod.position.set(side * 0.452, 0.45, 0);
      const cap = new Mesh(new CylinderGeometry(0.06, 0.06, 0.03, 24), yellow);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(side * 0.5, 0.45, 0);
      pod.castShadow = true;
      this.body.add(pod, cap);
    }

    // Antenna with a little star charm.
    const mast = new Mesh(new CylinderGeometry(0.011, 0.014, 0.17, 8), ivory);
    mast.position.set(0, 0.88, 0);
    const knob = new Mesh(new SphereGeometry(0.03, 16, 12), ivory);
    knob.position.set(0, 0.8, 0);
    const starGeo = new ExtrudeGeometry(starShape(0.065, 0.03), { depth: 0.018, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    starGeo.center();
    this.star = new Mesh(starGeo, new MeshStandardMaterial({ color: C.yellow, emissive: "#FFD670", emissiveIntensity: 1.6, roughness: 0.35 }));
    this.star.position.set(0, 1.0, 0);

    // A small status light low on the front.
    const status = new Mesh(new CircleGeometry(0.022, 16), new MeshBasicMaterial({ color: glow("#BFE6B0", 2), toneMapped: false }));
    status.position.set(0, 0.19, 0.448);
    status.rotation.x = -0.3;

    // Stubby floating arms with ivory mitts.
    for (const [pivot, side] of [
      [this.armL, -1],
      [this.armR, 1],
    ] as const) {
      pivot.position.set(side * 0.43, 0.3, 0.02);
      const arm = new Mesh(new CapsuleGeometry(0.055, 0.12, 6, 14), blue);
      arm.position.set(side * 0.04, -0.1, 0);
      arm.rotation.z = side * 0.25;
      const mitt = new Mesh(new SphereGeometry(0.06, 18, 12), ivory);
      mitt.position.set(side * 0.07, -0.2, 0);
      arm.castShadow = mitt.castShadow = true;
      pivot.add(arm, mitt);
      pivot.rotation.z = side * 0.15;
    }

    // Hover ring of light underneath.
    this.ring = new Mesh(new TorusGeometry(0.2, 0.022, 10, 40), new MeshBasicMaterial({ color: glow(C.sky, 2.2), transparent: true, toneMapped: false }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -0.05;

    this.body.add(shell, screen, rim, this.eyes, this.happyEyes, mouth, mast, knob, this.star, status, this.armL, this.armR, this.ring);
    this.lift.add(this.body);
    this.lift.position.y = HOVER;

    this.shadow = new Mesh(
      new CircleGeometry(0.5, 32),
      new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.8 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.renderOrder = 1;

    this.proxy = new Mesh(new SphereGeometry(0.62, 12, 8), new MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = HOVER + 0.42;
    this.speechAnchor.position.y = HOVER + 1.12;

    this.root.add(this.lift, this.shadow, this.proxy, this.speechAnchor);
    this.root.scale.setScalar(1.1);
  }

  /** Places the robot on the ground at `p` immediately. */
  teleport(p: Vector3): void {
    gsap.killTweensOf(this.root.position);
    this.arc = 0;
    this.root.position.copy(p);
  }

  /** Floats over to `p` in a gentle arc. */
  moveTo(p: Vector3, duration = 2.4): Promise<void> {
    const from = this.root.position.clone();
    const prog = { t: 0 };
    this.facing = p.clone();
    gsap.killTweensOf(this.root.position);
    return new Promise((resolve) => {
      gsap.to(prog, {
        t: 1,
        duration: this.motion.reduced ? Math.min(duration, 1.2) : duration,
        ease: "power1.inOut",
        onUpdate: () => {
          this.arc = Math.sin(prog.t * Math.PI) * 0.6;
          this.root.position.lerpVectors(from, p, prog.t);
          this.root.position.y += this.arc;
        },
        onComplete: () => {
          this.arc = 0;
          this.facing = null;
          resolve();
        },
      });
    });
  }

  /** Looks at a world point, or at the camera when `null`. */
  lookAt(p: Vector3 | null): void {
    this.facing = p ? p.clone() : null;
  }

  wave(times = 2): void {
    if (this.waving) return;
    this.waving = true;
    const r = this.armR.rotation;
    gsap
      .timeline({ onComplete: () => void (this.waving = false) })
      .to(r, { z: 2.5, x: -0.2, duration: 0.45, ease: "back.out(1.6)" })
      .to(r, { z: 2.0, duration: 0.28, ease: "sine.inOut", repeat: times * 2 - 1, yoyo: true })
      .to(r, { z: 0.15, x: 0, duration: 0.5, ease: "power2.inOut" });
  }

  /** A happy hop and spin when the visitor taps the robot. */
  react(): void {
    if (this.busy) return;
    this.busy = true;
    this.setHappy(true);
    const reduced = this.motion.reduced;
    gsap
      .timeline({
        onComplete: () => {
          this.busy = false;
          this.setHappy(false);
        },
      })
      .to(this.jump, { y: reduced ? 0.08 : 0.42, duration: 0.32, ease: "power2.out" })
      .to(this.jump, { spin: reduced ? 0 : Math.PI * 2, duration: 0.7, ease: "power2.inOut" }, 0)
      .to([this.armL.rotation, this.armR.rotation], { z: (i: number) => (i === 0 ? -1.4 : 1.4), duration: 0.25 }, 0)
      .to(this.jump, { y: 0, duration: 0.55, ease: "bounce.out" }, 0.32)
      .to([this.armL.rotation, this.armR.rotation], { z: (i: number) => (i === 0 ? -0.15 : 0.15), duration: 0.4 }, 0.6)
      .set(this.jump, { spin: 0 })
      .to({}, { duration: 0.5 });
  }

  setHappy(on: boolean): void {
    this.happyEyes.visible = on;
    this.eyes.visible = !on;
  }

  private blink(): void {
    if (!this.eyes.visible) return;
    gsap.timeline().to(this.eyes.scale, { y: 0.1, duration: 0.07, ease: "power1.in" }).to(this.eyes.scale, { y: 1, duration: 0.11, ease: "power1.out" });
  }

  update(t: number, dt: number, camera: Camera): void {
    const m = this.motion.amount;
    this.lift.position.y = HOVER + Math.sin(t * 2.1) * 0.05 * m + this.jump.y;
    this.body.rotation.z = Math.sin(t * 0.9) * 0.05 * m;
    this.body.rotation.x = Math.sin(t * 0.7 + 1) * 0.03 * m;
    this.star.rotation.y = t * 1.2;
    this.ring.material.opacity = 0.55 + 0.35 * Math.sin(t * 3.2);

    // Face the camera (or wherever it is heading), smoothly.
    const target = this.facing ?? camera.getWorldPosition(this.tmp2);
    this.root.getWorldPosition(this.tmp);
    const want = Math.atan2(target.x - this.tmp.x, target.z - this.tmp.z);
    let diff = want - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, dt * 3);
    this.body.rotation.y = this.yaw - this.root.rotation.y + this.jump.spin;

    // Idle arm sway when not waving.
    if (!this.waving && !this.busy) {
      this.armL.rotation.z = -0.15 - Math.sin(t * 1.6) * 0.06 * m;
      this.armR.rotation.z = 0.15 + Math.sin(t * 1.6 + 0.6) * 0.06 * m;
    }

    // Contact shadow shrinks as the robot rises.
    const rise = this.lift.position.y - HOVER + this.arc;
    const s = 1 - Math.min(0.55, Math.max(0, rise) * 0.9);
    this.shadow.position.y = 0.02 - this.arc / this.root.scale.y;
    this.shadow.scale.setScalar(s);
    this.shadow.material.opacity = 0.75 * s;

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink();
      this.nextBlink = 2.2 + Math.random() * 3.5;
      if (Math.random() < 0.2) setTimeout(() => this.blink(), 260);
    }
  }
}
