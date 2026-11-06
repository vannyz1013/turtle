import { SHOTS, SPOT } from "../../scene/layout";
import type { StoryContext } from "../context";

/** Scene 5: a quiet moment among the flowers while the letter unfolds. */
export async function letterScene(ctx: StoryContext): Promise<void> {
  ctx.dots.set(4);
  void ctx.world.setGolden(0.3, 4);
  void ctx.robot.moveTo(ctx.ground(SPOT.robotLetter), 2.6);
  await ctx.travel(SHOTS.letter, 3.2, "power2.inOut");
  document.body.classList.add("is-reading");
  await ctx.letter.present();
  document.body.classList.remove("is-reading");
}
