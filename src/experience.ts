import gsap from "gsap";
import { Vector3 } from "three";
import { AudioEngine } from "./audio/engine";
import type { Capabilities } from "./core/capabilities";
import { CameraRig, type Shot } from "./core/cameraRig";
import { Motion } from "./core/motion";
import { Picker } from "./core/picker";
import { Stage } from "./core/stage";
import { greeting } from "@edition/greeting";
import { extensions } from "@edition/extensions";
import type { Companion } from "./core/edition";
import { createEnv, installExtras } from "./core/editionRuntime";
import { createBursts } from "./objects/burst";
import { MagicDoor } from "./objects/door";
import { HappinessPocket } from "./objects/pocket";
import { Robot } from "./objects/robot";
import { clearSightline, planWishSpots, WishGarden } from "./objects/wishGarden";
import { GARDEN_SIGHTLINE, SHOTS, SPOT } from "./scene/layout";
import { World } from "./scene/world";
import { SPARKLES, type StoryContext } from "./story/context";
import { runStory } from "./story/director";
import { Flash } from "./ui/flash";
import { LetterCard } from "./ui/letter";
import { Panel } from "./ui/panel";
import { ProgressDots } from "./ui/progressDots";
import { SoundToggle } from "./ui/soundToggle";
import { WorldLabel } from "./ui/worldLabel";
import { disposeSharedTextures } from "./util/textures";
import { nextFrame } from "./util/wait";
import { pick } from "./util/random";

/**
 * Builds the 3D world and the interface on top of it, then hands over to the story.
 * Loaded lazily from main.ts, so the loading screen appears before three.js downloads.
 */
export async function startExperience(root: HTMLElement, caps: Capabilities, report: (p: number) => void): Promise<() => void> {
  const motion = new Motion();
  const effects = extensions.effects ?? {};
  const sparkles = effects.sparkleColors ?? SPARKLES;
  const stage = new Stage(root, caps.tier, { bloom: effects.bloom });
  const rig = new CameraRig(stage.camera, motion);
  const picker = new Picker(stage.renderer.domElement, stage.camera);
  const audio = new AudioEngine();
  report(0.05);
  await nextFrame();

  const wishSpots = planWishSpots();
  const world = await World.create(stage, { wishSpots, petalColors: effects.petalColors, report: (p) => report(0.05 + p * 0.6) });
  stage.scene.add(world.group);

  // Interface layer.
  const ui = document.createElement("div");
  ui.className = "ui";
  root.append(ui);
  const panel = new Panel(ui);
  const speech = new WorldLabel(ui, stage.camera, "speech", panel.el);
  const wish = new WorldLabel(ui, stage.camera, "wish", panel.el);
  const dots = new ProgressDots(ui);
  new SoundToggle(ui, (on) => audio.setEnabled(on));
  const letter = new LetterCard(ui, motion, (kind) => audio.play(kind));
  const flash = new Flash(ui);
  const burst = createBursts(stage);

  const groundAt = (x: number, z: number): number =>
    (world.islandA.contains(x, z, 1.05) ? world.islandA : world.islandB).heightAt(x, z);
  const ground = (spot: Vector3): Vector3 => new Vector3(spot.x, groundAt(spot.x, spot.z), spot.z);

  // Services for edition code, then the guide and the story objects.
  const env = createEnv({
    stage,
    motion,
    groundAt,
    spots: SPOT,
    burst,
    sparkles,
    say: (text, anchor, ms) => speech.show(text, anchor, { duration: ms }),
    play: (kind) => audio.play(kind),
  });
  const robot: Companion = extensions.companion ? await extensions.companion.create(env) : new Robot(motion);
  const door = new MagicDoor(motion);
  door.group.position.set(SPOT.door.x, world.islandA.heightAt(SPOT.door.x, SPOT.door.z) - 0.05, SPOT.door.z);
  const pocket = new HappinessPocket(motion);
  pocket.group.position.set(SPOT.pocket.x, world.islandB.heightAt(SPOT.pocket.x, SPOT.pocket.z) - 0.03, SPOT.pocket.z);
  // Wish flowers keep clear of the line from the garden cameras (landscape and portrait) to Sunny.
  // Decorative flowers still use the original plan, so the rest of the garden is unchanged.
  const gardenView = SHOTS.garden;
  const flowerSpots = clearSightline(
    wishSpots,
    SPOT.robotGarden,
    [gardenView.pos, gardenView.portrait?.pos ?? gardenView.pos],
    GARDEN_SIGHTLINE.halfWidth,
    GARDEN_SIGHTLINE.length,
  );
  const garden = new WishGarden(world.islandB, flowerSpots, extensions.flowers?.tones);
  stage.scene.add(robot.root, door.group, pocket.group, garden.group);
  await installExtras(extensions, env, stage, picker);
  report(0.72);
  await nextFrame();

  const ctx: StoryContext = {
    stage,
    rig,
    picker,
    motion,
    world,
    robot,
    door,
    pocket,
    garden,
    panel,
    speech,
    wish,
    flash,
    dots,
    letter,
    audio,
    burst,
    sparkles,
    ground,
    async travel(shot: Shot, duration: number, ease?: string) {
      if (motion.reduced || duration === 0) {
        await flash.in(0.35);
        rig.set(shot);
        await flash.out(0.5);
      } else {
        await rig.fly(shot, duration, ease);
      }
    },
  };

  // Sunny is always happy to be tapped.
  picker.add(robot.proxy, {
    onClick: () => {
      robot.react();
      audio.play("boop");
      burst(robot.speechAnchor.getWorldPosition(new Vector3()), sparkles, 40);
      speech.show(pick(Math.random, greeting.robot.pokes), robot.speechAnchor, { duration: 2400 });
    },
  });

  stage.onTick((t, dt) => {
    const m = motion.amount;
    world.update(t, dt, stage.camera, m);
    rig.update(t, dt);
    robot.update(t, dt, stage.camera);
    door.update(t);
    pocket.update(t, stage.camera.position);
    garden.update(t, m);
    speech.update();
    wish.update();
  });

  rig.set({ pos: new Vector3(19, 11, 33), target: new Vector3(0, 1, 0) });
  rig.update(0, 0);
  report(0.8);
  await nextFrame();
  await stage.compile();
  report(1);

  stage.start();
  void runStory(ctx);
  // Handy for poking at the scene from the console while developing. Not in production builds.
  if (import.meta.env.DEV) Object.assign(window, { sunshine: ctx, gsap });

  return () => {
    picker.dispose();
    rig.dispose();
    motion.dispose();
    audio.dispose();
    stage.dispose();
    disposeSharedTextures();
    ui.remove();
  };
}
