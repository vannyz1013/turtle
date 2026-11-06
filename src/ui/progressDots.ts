import { el } from "./dom";

const NAMES = ["Welcome", "The magical door", "A pocket full of happiness", "A garden of wishes", "A little message", "See you soon"];

/** Six small dots showing which part of the journey the visitor is in. */
export class ProgressDots {
  readonly el: HTMLElement;
  private readonly dots: HTMLElement[];
  private readonly sr: HTMLElement;

  constructor(parent: HTMLElement) {
    this.dots = NAMES.map(() => el("span", { class: "dot", attrs: { "aria-hidden": "true" } }));
    this.sr = el("span", { class: "sr-only" });
    this.el = el("nav", { class: "progress-dots", attrs: { "aria-label": "Journey progress" } }, [...this.dots, this.sr]);
    parent.append(this.el);
  }

  set(i: number): void {
    this.dots.forEach((d, k) => {
      d.classList.toggle("is-current", k === i);
      d.classList.toggle("is-done", k < i);
    });
    this.sr.textContent = `Scene ${i + 1} of ${NAMES.length}: ${NAMES[i]}`;
  }
}
