import { Vector3 } from "three";
import { greeting } from "@edition/greeting";
import type { WishFlower } from "../../objects/wishGarden";
import { SHOTS, SPOT } from "../../scene/layout";
import { Scope } from "../../util/wait";
import { type StoryContext } from "../context";
import type { PanelAction } from "../../ui/panel";

const BASE_BLOOM = 0.5;

/**
 * Scene 4: the garden of wishes. Tapping a flower opens it and reveals a wish; the whole
 * garden grows more colourful and more butterflies arrive. No goals, no timers.
 */
export async function gardenScene(ctx: StoryContext): Promise<void> {
  const { robot, garden, panel, speech, wish, picker, world } = ctx;
  const scope = new Scope();
  const G = greeting.garden;
  ctx.dots.set(3);

  void robot.moveTo(ctx.ground(SPOT.robotGarden), 3);
  await ctx.travel(SHOTS.garden, 3.4);

  let next: () => void = () => {};
  const finished = new Promise<void>((r) => (next = r));
  const total = garden.flowers.length;

  const actions = (): PanelAction[] => {
    const list: PanelAction[] = [];
    if (garden.bloomedCount < total) list.push({ label: `🌸 ${G.pick}`, onClick: () => bloomNext(), variant: "ghost" });
    if (garden.bloomedCount > 0) list.push({ label: `${G.next} →`, onClick: () => next() });
    return list;
  };

  const refresh = () => {
    const n = garden.bloomedCount;
    world.setGardenBloom(BASE_BLOOM + (1 - BASE_BLOOM) * (n / total));
    world.butterflies.setVisible(1, 2 + Math.round((n / total) * 10));
  };

  let tapped = false;
  const tap = (f: WishFlower) => {
    tapped = true;
    const head = f.head.getWorldPosition(new Vector3());
    const msg = greeting.flowerMessages[f.index % greeting.flowerMessages.length];
    speech.hide(); // one bubble at a time
    if (!f.bloomed) {
      const firstBloom = garden.bloomedCount === 0;
      f.bloom();
      ctx.audio.play("bloom");
      ctx.burst(head, ["#FFFFFF", "#FFE8A8", f.tone], 60);
      refresh();
      if (firstBloom || garden.bloomedCount === total) panel.setActions(actions());
      if (garden.bloomedCount === total) {
        panel.setText(G.full);
        robot.react();
        scope.timeout(() => {
          wish.hide();
          speech.show(greeting.robot.allBloomed, robot.speechAnchor, { duration: 3500 });
        }, 2800);
        world.setGardenBloom(1.0, 2.5);
      }
    } else {
      ctx.audio.play("boop");
    }
    wish.show(msg, f.head, { offsetY: 0.35 });
  };

  const bloomNext = () => {
    const f = garden.nextUnbloomed();
    if (f) tap(f);
  };

  for (const f of garden.flowers) {
    const handle = picker.add(f.proxy, { onClick: () => tap(f), onHover: (on) => f.setHover(on) });
    scope.add(() => handle.remove());
  }

  refresh();
  void panel.show({ placement: "bottom", title: G.title, text: garden.bloomedCount === total ? G.full : G.text, actions: actions() });
  scope.timeout(() => {
    if (!tapped) speech.show(greeting.robot.garden, robot.speechAnchor, { duration: 4000 });
  }, 500);

  await finished;
  scope.dispose();
  garden.flowers.forEach((f) => f.setHover(false));
  wish.hide();
  speech.hide();
  await panel.hide();
}
