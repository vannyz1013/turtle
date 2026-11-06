import { Vector3, type Object3D } from "three";
import type { EditionEnv, EditionExtensions, EditionSound } from "./edition";
import type { Picker } from "./picker";
import type { Stage } from "./stage";

/** Engine services exposed to edition code (see EditionEnv). */
export interface EnvServices {
  stage: Stage;
  motion: { readonly reduced: boolean; readonly amount: number };
  groundAt(x: number, z: number): number;
  spots: Readonly<Record<string, Vector3>>;
  burst(at: Vector3, colors: readonly string[], count?: number): void;
  sparkles: readonly string[];
  say(text: string, anchor: Object3D, durationMs?: number): void;
  play(kind: EditionSound): void;
}

export function createEnv(s: EnvServices): EditionEnv {
  return {
    motion: s.motion,
    ground: (x, z) => new Vector3(x, s.groundAt(x, z), z),
    spots: s.spots,
    onTick: (fn) => s.stage.onTick(fn),
    burst: (at, colors, count) => s.burst(at, colors ?? s.sparkles, count),
    say: (text, anchor, durationMs = 3000) => s.say(text, anchor, durationMs),
    playSound: (kind) => s.play(kind),
  };
}

/**
 * Adds an edition's optional decorations and props to the scene. With no extensions
 * (the public edition) this does nothing.
 */
export async function installExtras(ext: EditionExtensions, env: EditionEnv, stage: Stage, picker: Picker): Promise<void> {
  for (const make of ext.decorations ?? []) {
    stage.scene.add(await make(env));
  }
  for (const prop of ext.props ?? []) {
    const obj = await prop.create(env);
    stage.scene.add(obj);
    const interact = prop.interact;
    if (interact) {
      picker.add(interact.proxy?.(obj) ?? obj, {
        onClick: () => interact.onTap(env, obj),
        onHover: interact.onHover ? (over) => interact.onHover!(over, obj) : undefined,
      });
    }
    if (prop.update) {
      const update = prop.update;
      stage.onTick((t, dt) => update(t, dt, obj));
    }
  }
}
