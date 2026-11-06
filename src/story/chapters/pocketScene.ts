import { greeting } from "@edition/greeting";
import { SHOTS } from "../../scene/layout";
import { ShuffleBag } from "../../util/random";
import { Scope } from "../../util/wait";
import type { StoryContext } from "../context";

const bag = new ShuffleBag(greeting.pocketMessages);

/** Scene 3: the pocket of happiness. Every tap opens it and lets out a different wish. */
export async function pocketScene(ctx: StoryContext): Promise<void> {
  const { rig, robot, pocket, panel, speech, wish, picker } = ctx;
  const scope = new Scope();
  const P = greeting.pocket;
  ctx.dots.set(2);

  if (ctx.motion.reduced) rig.set(SHOTS.pocket);
  else void rig.fly(SHOTS.pocket, 3.2, "power3.out");
  await ctx.flash.out(1.1);
  robot.wave(2);
  let busy = false;
  let opens = 0;
  scope.timeout(() => {
    if (opens === 0 && !busy) speech.show(greeting.robot.pocket, robot.speechAnchor, { duration: 4200 });
  }, 400);

  let next: () => void = () => {};
  const finished = new Promise<void>((r) => (next = r));

  const openOnce = async () => {
    if (busy) return;
    busy = true;
    speech.hide();
    if (pocket.isOpen) {
      wish.hide();
      await pocket.close();
    }
    ctx.audio.play("pop");
    const opening = pocket.open();
    setTimeout(() => ctx.burst(pocket.coreWorld(), ctx.sparkles, 110), 220);
    await opening;
    wish.show(bag.next(), pocket.messageAnchor);
    opens++;
    if (opens === 1) {
      panel.setActions([
        { label: P.again, onClick: () => void openOnce(), variant: "ghost" },
        { label: `${P.next} →`, onClick: () => next() },
      ]);
    }
    busy = false;
  };

  const handle = picker.add(pocket.proxy, { onClick: () => void openOnce(), onHover: (on) => pocket.setHover(on) });
  scope.add(() => handle.remove());
  void panel.show({
    placement: "bottom",
    title: P.title,
    text: P.text,
    actions: [{ label: P.open, onClick: () => void openOnce() }],
  });

  await finished;
  scope.dispose();
  pocket.setHover(false);
  wish.hide();
  speech.hide();
  void pocket.close();
  await panel.hide();
}
