import { greeting } from "@edition/greeting";
import { ISLAND_A, SHOTS, SPOT } from "../../scene/layout";
import { Scope } from "../../util/wait";
import type { StoryContext } from "../context";

/** Scene 1: the floating garden. The camera drifts in towards Sunny, who waves hello. */
export async function welcome(ctx: StoryContext, returning: boolean): Promise<void> {
  const { rig, robot, panel, speech, world } = ctx;
  const scope = new Scope();
  ctx.dots.set(0);
  world.lights.setFocus(ISLAND_A.center);
  robot.teleport(ctx.ground(SPOT.robotWelcome));
  robot.lookAt(null);
  rig.set(SHOTS.welcomeStart);
  if (returning) await ctx.flash.out(1.0);

  if (ctx.motion.reduced) rig.set(SHOTS.welcomeEnd);
  else void rig.fly(SHOTS.welcomeEnd, 7.5, "power2.inOut");

  scope.timeout(() => {
    robot.wave(2);
    ctx.audio.play("boop");
    speech.show(greeting.robot.hello, robot.speechAnchor, { duration: 5200 });
  }, ctx.motion.reduced ? 1400 : 4600);

  await new Promise<void>((resolve) => {
    scope.timeout(() => {
      void panel.show({
        placement: "top",
        size: "hero",
        title: greeting.welcome.title,
        text: greeting.welcome.text,
        actions: [{ label: greeting.welcome.button, onClick: () => resolve() }],
      });
    }, 1200);
  });

  scope.dispose();
  speech.hide();
  ctx.audio.play("sparkle");
  await panel.hide();
}
