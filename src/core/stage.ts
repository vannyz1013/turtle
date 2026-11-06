import {
  HalfFloatType,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  type Texture,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ScaledBloomPass } from "./scaledBloom";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Tier } from "./capabilities";
import { disposeTree } from "../util/dispose";

export type TickFn = (time: number, delta: number) => void;

export interface StageOptions {
  /** Bloom look. Defaults match the public edition. */
  bloom?: { strength?: number; radius?: number; threshold?: number };
  /** Bloom resolution as a fraction of the screen (default 0.5). 1 = original full-cost bloom. */
  bloomScale?: number;
  /** MSAA samples for the main render target (default 4). */
  samples?: number;
}

/**
 * Owns the renderer, camera, scene and frame loop. Quality adapts at runtime: if frames
 * get slow it first halves anti-aliasing samples (measured: the cheapest visual cost for
 * the biggest saving), then lowers the pixel ratio, then turns bloom off.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;

  private composer: EffectComposer | null = null;
  private bloom: ScaledBloomPass | null = null;
  private readonly env: Texture;
  private readonly ticks = new Set<TickFn>();
  private readonly timer = new Timer();
  private raf = 0;
  private pixelRatio: number;
  private samples: number;
  private perf = { time: 0, frames: 0, windows: 0, settled: false };

  constructor(
    private readonly container: HTMLElement,
    readonly tier: Tier,
    opts: StageOptions = {},
  ) {
    const useComposer = tier !== "low";
    this.samples = opts.samples ?? 4;
    this.renderer = new WebGLRenderer({
      antialias: !useComposer,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = tier !== "low";
    this.renderer.shadowMap.type = PCFShadowMap;

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : tier === "medium" ? 1.5 : 1);
    this.renderer.setPixelRatio(this.pixelRatio);

    const canvas = this.renderer.domElement;
    canvas.className = "scene-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "A floating 3D garden in the clouds, with a little blue robot companion.");
    container.prepend(canvas);

    this.camera = new PerspectiveCamera(42, 1, 0.1, 700);

    // A soft studio environment gives the robot and gadgets gentle reflections.
    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.42;

    if (useComposer) {
      const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: this.samples });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const b = opts.bloom ?? {};
      this.bloom = new ScaledBloomPass(
        new Vector2(256, 256),
        b.strength ?? 0.32,
        b.radius ?? 0.45,
        b.threshold ?? 1.2,
        opts.bloomScale ?? 0.5,
      );
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.timer.connect(document);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  get currentPixelRatio(): number {
    return this.pixelRatio;
  }

  /** Bloom resolution scale; used for performance tuning. */
  setBloomScale(scale: number): void {
    this.bloom?.setScale(scale);
  }

  /** MSAA sample count of the main render target; used for performance tuning. */
  setSamples(samples: number): void {
    if (!this.composer) return;
    this.samples = samples;
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      rt.samples = samples;
      rt.dispose(); // re-created with the new sample count on next use
    }
  }

  onTick(fn: TickFn): () => void {
    this.ticks.add(fn);
    return () => this.ticks.delete(fn);
  }

  /** Pre-compiles every shader so the first interaction does not stutter. */
  async compile(): Promise<void> {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.render();
  }

  start(): void {
    const loop = (timestamp: number): void => {
      this.raf = requestAnimationFrame(loop);
      this.timer.update(timestamp);
      const raw = this.timer.getDelta();
      const dt = Math.min(raw, 1 / 20);
      const t = this.timer.getElapsed();
      this.ticks.forEach((fn) => fn(t, dt));
      this.render();
      this.watchPerformance(raw);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private resize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.pixelRatio);
      this.composer.setSize(w, h);
    }
  };

  private watchPerformance(raw: number): void {
    if (this.perf.settled || raw > 0.5) return; // skip tab switches
    this.perf.time += raw;
    this.perf.frames++;
    if (this.perf.time < 2.5) return;
    const avg = this.perf.time / this.perf.frames;
    this.perf.time = 0;
    this.perf.frames = 0;
    this.perf.windows++;
    if (this.perf.windows < 2) return; // let shaders and caches warm up first
    // Very slow frames mean the browser is throttling a hidden window, not that the GPU struggles.
    if (avg > 0.25) return;
    if (avg > 1 / 40) {
      if (this.composer && this.samples > 2) {
        this.setSamples(2);
      } else if (this.pixelRatio > 1.01) {
        this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
        this.resize();
      } else if (this.bloom?.enabled) {
        this.bloom.enabled = false;
      } else {
        this.perf.settled = true;
      }
    } else if (this.perf.windows > 12) {
      this.perf.settled = true; // stable for half a minute: stop measuring
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.ticks.clear();
    this.timer.dispose();
    disposeTree(this.scene);
    this.env.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
