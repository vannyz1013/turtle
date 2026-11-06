import type { Vector3 } from "three";
import type { AudioEngine } from "../audio/engine";
import type { CameraRig, Shot } from "../core/cameraRig";
import type { Motion } from "../core/motion";
import type { Picker } from "../core/picker";
import type { Stage } from "../core/stage";
import type { Burst } from "../objects/burst";
import type { MagicDoor } from "../objects/door";
import type { HappinessPocket } from "../objects/pocket";
import type { Companion } from "../core/edition";
import type { WishGarden } from "../objects/wishGarden";
import type { World } from "../scene/world";
import type { Flash } from "../ui/flash";
import type { LetterCard } from "../ui/letter";
import type { Panel } from "../ui/panel";
import type { ProgressDots } from "../ui/progressDots";
import type { WorldLabel } from "../ui/worldLabel";

/** Everything a story chapter can touch. */
export interface StoryContext {
  stage: Stage;
  rig: CameraRig;
  picker: Picker;
  motion: Motion;
  world: World;
  /** The guide character: Sunny by default, or an edition's companion. */
  robot: Companion;
  door: MagicDoor;
  pocket: HappinessPocket;
  garden: WishGarden;
  panel: Panel;
  speech: WorldLabel;
  wish: WorldLabel;
  flash: Flash;
  dots: ProgressDots;
  letter: LetterCard;
  audio: AudioEngine;
  burst: Burst;
  /** Sparkle colours for bursts (edition effect, default SPARKLES). */
  sparkles: readonly string[];
  /** Moves the camera: a flight normally, a soft fade with reduced motion. */
  travel(shot: Shot, duration: number, ease?: string): Promise<void>;
  /** A spot snapped onto the ground of whichever island it is on. */
  ground(spot: Vector3): Vector3;
}

export const SPARKLES = ["#FFE8A8", "#F5DF9B", "#E8BFC0", "#C7E5F2", "#FFFFFF"] as const;
