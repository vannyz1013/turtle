import gsap from "gsap";
import { el } from "./dom";

/** A soft, warm full-screen glow used to hide jumps between places. */
export class Flash {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = el("div", { class: "flash", attrs: { "aria-hidden": "true" } });
    parent.append(this.el);
  }

  in(duration = 0.7): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.el, { opacity: 1, duration, ease: "sine.in", overwrite: true, onComplete: () => resolve() });
    });
  }

  out(duration = 0.9): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.el, { opacity: 0, duration, ease: "sine.out", overwrite: true, onComplete: () => resolve() });
    });
  }
}
