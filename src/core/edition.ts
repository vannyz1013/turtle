import type { Camera, Object3D, Vector3 } from "three";

// The contract between the shared engine and an edition.
//
// An edition is a folder that the build resolves as `@edition` (see vite.config.ts).
// It must provide:
//   @edition/greeting   → `greeting`  (every word the visitor reads)
//   @edition/palette    → `C`, `FLOWER_TONES` (colours used by the 3D world)
//   @edition/theme.css  → CSS custom properties (colours and fonts for the interface)
// The public edition lives in src/edition/. Other editions live in their own repositories
// and point the alias at their own folder; nothing flows back into this repository.

export interface EditionGreeting {
  title: string;
  tagline: string;
  loading: string;
  welcome: { title: string; text: string; button: string };
  door: { text: string; hint: string };
  pocket: { title: string; text: string; open: string; again: string; next: string };
  /** Revealed one at a time, in random order, from the pocket. */
  pocketMessages: readonly string[];
  garden: { title: string; text: string; pick: string; next: string; full: string };
  /** One per wish flower (the garden has twelve; extra or missing entries wrap around). */
  flowerMessages: readonly string[];
  letter: {
    heading: string;
    open: string;
    salutation: string;
    paragraphs: readonly string[];
    closing: string;
    signature: string;
    next: string;
  };
  finale: { title: string; text: string; button: string };
  robot: {
    name: string;
    hello: string;
    door: string;
    pocket: string;
    garden: string;
    allBloomed: string;
    finale: string;
    pokes: readonly string[];
  };
  sound: { on: string; off: string };
  fallback: { note: string; pocketButton: string };
}

/** Colours the 3D world reads. Values are CSS colour strings. */
export interface EditionPalette {
  ivory: string;
  sky: string;
  powder: string;
  sage: string;
  yellow: string;
  pink: string;
  robotBlue: string;
  deepSage: string;
  leaf: string;
  soil: string;
  soilDeep: string;
  rock: string;
  stone: string;
  trunk: string;
  gold: string;
  lilac: string;
  peach: string;
  rose: string;
  bluebell: string;
  ink: string;
}

// ---------------------------------------------------------------------------
// Optional extensions: `@edition/extensions` exports `extensions: EditionExtensions`.
// Every field is optional. An empty object gives the public experience unchanged.
// ---------------------------------------------------------------------------

/** What the story needs from the companion who guides the visitor. Sunny implements this. */
export interface Companion {
  /** Placed on the ground; everything else hangs off it. */
  readonly root: Object3D;
  /** Where speech bubbles attach (above the head). */
  readonly speechAnchor: Object3D;
  /** Invisible, generous shape used for tap detection. */
  readonly proxy: Object3D;
  teleport(ground: Vector3): void;
  moveTo(ground: Vector3, duration?: number): Promise<void>;
  /** Face a world point, or the camera when `null`. */
  lookAt(point: Vector3 | null): void;
  wave(times?: number): void;
  /** A happy reaction when tapped. */
  react(): void;
  setHappy(on: boolean): void;
  update(time: number, delta: number, camera: Camera): void;
}

/** Sounds an edition may trigger. */
export type EditionSound = "sparkle" | "pop" | "whoosh" | "bloom" | "boop" | "page";

/** Services the engine hands to edition code. */
export interface EditionEnv {
  readonly motion: { readonly reduced: boolean; readonly amount: number };
  /** Ground height at (x, z) on whichever island is there. */
  ground(x: number, z: number): Vector3;
  /** Named story locations (see src/scene/layout.ts SPOT). */
  readonly spots: Readonly<Record<string, Vector3>>;
  onTick(fn: (time: number, delta: number) => void): () => void;
  burst(at: Vector3, colors?: readonly string[], count?: number): void;
  /** Shows a speech bubble pinned to an object. */
  say(text: string, anchor: Object3D, durationMs?: number): void;
  playSound(kind: EditionSound): void;
}

/** Records the permission for a third-party asset. Required for anything not original. */
export interface AssetLicence {
  /** Rights holder. */
  owner: string;
  /** Who received the permission. */
  licensee: string;
  /** Licence or agreement reference (document name, number, date). */
  reference: string;
  /** What is allowed: e.g. "private, non-commercial, access-controlled website". */
  scope: string;
}

export interface CompanionSlot {
  /** Builds the guide character. Default: Sunny. */
  create(env: EditionEnv): Companion | Promise<Companion>;
  /** Mandatory when the character is someone else's intellectual property. */
  licence?: AssetLicence;
}

/** An original 3D object placed in the world, optionally interactive. */
export interface EditionProp {
  create(env: EditionEnv): Object3D | Promise<Object3D>;
  /** Tap and hover behaviour. The tap target defaults to the object itself. */
  interact?: {
    proxy?: (obj: Object3D) => Object3D;
    onTap(env: EditionEnv, obj: Object3D): void;
    onHover?(over: boolean, obj: Object3D): void;
  };
  /** Called every frame. */
  update?(time: number, delta: number, obj: Object3D): void;
}

export interface EditionEffects {
  /** Bloom look (defaults: strength 0.32, radius 0.45, threshold 1.2). */
  bloom?: { strength?: number; radius?: number; threshold?: number };
  /** Colours of tap sparkles. */
  sparkleColors?: readonly string[];
  /** Colours of the finale's drifting petals. */
  petalColors?: readonly string[];
}

export interface EditionExtensions {
  /** Replace Sunny with another guide. Third-party characters need `licence`. */
  companion?: CompanionSlot;
  /** Extra original objects; may be interactive. */
  props?: readonly EditionProp[];
  /** Extra static scene decoration. */
  decorations?: ReadonlyArray<(env: EditionEnv) => Object3D | Promise<Object3D>>;
  /** Wish flower colours (their messages are `greeting.flowerMessages`). */
  flowers?: { tones?: readonly string[] };
  effects?: EditionEffects;
}
