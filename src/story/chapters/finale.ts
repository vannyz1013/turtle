import { greeting } from "@edition/greeting";
import { ISLAND_A, SHOTS, SPOT } from "../../scene/layout";
import { Scope } from "../../util/wait";
import type { StoryContext } from "../context";

/**
 * Scene 6: see you soon. Golden light, stars, drifting petals; Sunny waves goodbye and
 * the camera pulls back to show the whole garden. Visitors can start the journey again.
 */
export async function finale(ctx: StoryContext): Promise<void> {
  const { rig, robot, panel, speech, world } = ctx;
  const scope = new Scope();
  const F = greeting.finale;
  ctx.dots.set(5);

  void world.setGolden(1, 6);
  world.setStars(1, 6);
  world.setPetals(1, 4);
  robot.teleport(ctx.ground(SPOT.robotFinale));
  robot.lookAt(null);
  await ctx.travel(SHOTS.finaleStart, 2.6);

  robot.wave(3);
  ctx.audio.play("sparkle");
  ctx.burst(robot.speechAnchor.getWorldPosition(robot.root.position.clone()), ctx.sparkles, 80);
  speech.show(greeting.robot.finale, robot.speechAnchor, { duration: 4500 });
  scope.interval(() => robot.wave(2), 5200);

  if (ctx.motion.reduced) {
    scope.timeout(() => void ctx.travel(SHOTS.finaleEnd, 0), 4000);
  } else {
    scope.timeout(() => void rig.fly(SHOTS.finaleEnd, 12, "sine.inOut"), 1800);
  }

  await new Promise<void>((resolve) => {
    scope.timeout(() => {
      void panel.show({
        placement: "top",
        size: "hero",
        title: F.title,
        text: F.text,
        actions: [{ label: `☀️ ${F.button}`, onClick: () => resolve() }],
      });
    }, 2600);
  });

  scope.dispose();
  speech.hide();
  await panel.hide();
  await ctx.flash.in(1.0);

  // Reset the mood for the next visit; the garden keeps its blooms.
  void world.setGolden(0, 0);
  world.setStars(0, 0.01);
  world.setPetals(0, 0.01);
  world.lights.setFocus(ISLAND_A.center);
  ctx.door.reset();
}
