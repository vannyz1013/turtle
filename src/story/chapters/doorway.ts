import { greeting } from "@edition/greeting";
import { ISLAND_B, SHOTS, SPOT } from "../../scene/layout";
import { Scope, sleep } from "../../util/wait";
import type { StoryContext } from "../context";

/** Scene 2: the magical door. Hover makes it glow; a tap opens it and we pass through. */
export async function doorway(ctx: StoryContext): Promise<void> {
  const { rig, robot, door, panel, speech, picker } = ctx;
  const scope = new Scope();
  ctx.dots.set(1);

  void robot.moveTo(ctx.ground(SPOT.robotDoor), 2.6);
  await ctx.travel(SHOTS.door, 3.2);

  await new Promise<void>((resolve) => {
    let done = false;
    const open = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const handle = picker.add(door.proxy, { onClick: open, onHover: (on) => door.setHover(on) });
    scope.add(() => handle.remove());
    void panel.show({
      placement: "bottom",
      text: greeting.door.text,
      actions: [{ label: `✨ ${greeting.door.hint}`, onClick: open, variant: "ghost" }],
    });
    scope.timeout(() => speech.show(greeting.robot.door, robot.speechAnchor, { duration: 4000 }), 700);
    // A gentle pulse invites the tap if nothing happens for a while.
    scope.interval(() => {
      door.setHover(true);
      setTimeout(() => door.setHover(false), 700);
    }, 6000);
  });

  scope.dispose();
  door.setHover(false);
  speech.hide();
  void panel.hide();
  ctx.audio.play("whoosh");
  robot.setHappy(true);
  await door.open();

  if (ctx.motion.reduced) {
    await ctx.flash.in(0.6);
  } else {
    const through = rig.fly(SHOTS.doorThrough, 1.9, "power2.in");
    await sleep(1000);
    await ctx.flash.in(0.8);
    await through;
  }

  // Behind the glow: arrive on the garden island.
  robot.setHappy(false);
  door.reset();
  ctx.world.lights.setFocus(ISLAND_B.center);
  robot.teleport(ctx.ground(SPOT.robotPocket));
  rig.set(SHOTS.pocketArrive);
}
