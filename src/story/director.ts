import type { StoryContext } from "./context";
import { doorway } from "./chapters/doorway";
import { finale } from "./chapters/finale";
import { gardenScene } from "./chapters/gardenScene";
import { letterScene } from "./chapters/letterScene";
import { pocketScene } from "./chapters/pocketScene";
import { welcome } from "./chapters/welcome";

/** Plays the six scenes in order, and starts again whenever the visitor asks. */
export async function runStory(ctx: StoryContext): Promise<void> {
  let returning = false;
  for (;;) {
    await welcome(ctx, returning);
    await doorway(ctx);
    await pocketScene(ctx);
    await gardenScene(ctx);
    await letterScene(ctx);
    await finale(ctx);
    returning = true;
  }
}
