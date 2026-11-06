import gsap from "gsap";
import { greeting } from "@edition/greeting";
import type { Motion } from "../core/motion";
import { el, wait } from "./dom";

/**
 * The letter: a sealed envelope that opens, a card that rises out of it and unfolds,
 * then the words appear line by line. All text comes from `greeting.letter`.
 */
export class LetterCard {
  private readonly layer: HTMLElement;
  private readonly envelope: HTMLButtonElement;
  private readonly flap: HTMLElement;
  private readonly seal: HTMLElement;
  private readonly card: HTMLElement;
  private readonly paper: HTMLElement;
  private readonly fold: HTMLElement;
  private readonly lines: HTMLElement[];
  private readonly actions: HTMLElement;
  private readonly heading: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly motion: Motion,
    private readonly onSound: (kind: "page" | "sparkle") => void,
  ) {
    const L = greeting.letter;
    this.flap = el("span", { class: "env-flap" });
    this.seal = el("span", { class: "env-seal", text: "☀" });
    this.envelope = el("button", { class: "envelope", attrs: { type: "button", "aria-label": L.open } }, [
      el("span", { class: "env-back" }),
      el("span", { class: "env-peek" }),
      el("span", { class: "env-front" }),
      this.flap,
      this.seal,
    ]);

    this.lines = [
      el("p", { class: "letter-salutation", text: L.salutation }),
      ...L.paragraphs.map((t) => el("p", { text: t })),
      el("p", { class: "letter-closing", text: L.closing }),
      el("p", { class: "letter-signature", text: L.signature }),
    ];
    this.paper = el("div", { class: "letter-paper", attrs: { tabindex: "0" } }, [el("span", { class: "letter-doodle", attrs: { "aria-hidden": "true" } }), ...this.lines]);
    this.fold = el("div", { class: "letter-fold", attrs: { "aria-hidden": "true" } });
    this.card = el("article", { class: "letter-card", attrs: { "aria-label": greeting.letter.heading } }, [this.paper, this.fold]);

    this.heading = el("h2", { class: "letter-heading", text: L.heading, attrs: { id: "letter-heading" } });
    this.actions = el("div", { class: "letter-actions" });
    this.layer = el("div", { class: "letter-layer", attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "letter-heading" } }, [
      this.heading,
      el("div", { class: "letter-stage" }, [this.envelope, this.card]),
      this.actions,
    ]);
    this.layer.hidden = true;
    parent.append(this.layer);
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = el("button", { class: "btn btn-primary", text: label, attrs: { type: "button" } });
    b.addEventListener("click", onClick, { once: true });
    this.actions.replaceChildren(b);
    return b;
  }

  /** Shows the envelope; resolves once the visitor has read the letter and pressed Continue. */
  async present(): Promise<void> {
    this.reset();
    this.layer.hidden = false;
    await wait(20);
    this.layer.classList.add("is-visible");
    gsap.fromTo(this.envelope, { y: 40, opacity: 0, rotate: -4 }, { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: "back.out(1.4)" });

    await new Promise<void>((resolve) => {
      let started = false;
      const open = () => {
        if (started) return;
        started = true;
        resolve();
      };
      this.envelope.addEventListener("click", open, { once: true });
      this.button(greeting.letter.open, open).focus({ preventScroll: true });
    });
    this.actions.replaceChildren();
    await this.unfold();

    await new Promise<void>((resolve) => {
      const b = this.button(greeting.letter.next, () => resolve());
      gsap.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
      this.paper.focus({ preventScroll: true });
    });
    this.layer.classList.remove("is-visible");
    await wait(600);
    this.layer.hidden = true;
  }

  private unfold(): Promise<void> {
    this.onSound("page");
    const reduced = this.motion.reduced;
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: () => resolve() });
      if (reduced) {
        tl.to(this.envelope, { opacity: 0, duration: 0.4 })
          .set(this.envelope, { display: "none" })
          .set(this.card, { display: "flex", clipPath: "inset(0% 0 0 0)" })
          .set(this.fold, { display: "none" })
          .fromTo(this.card, { opacity: 0 }, { opacity: 1, duration: 0.5 })
          .to(this.lines, { opacity: 1, duration: 0.4 });
        return;
      }
      tl.to(this.seal, { scale: 0, opacity: 0, duration: 0.3, ease: "back.in(2)" })
        .to(this.flap, { rotateX: 180, duration: 0.6, ease: "power2.inOut" })
        .set(this.flap, { zIndex: 0 })
        .to(this.envelope, { y: "38vh", opacity: 0, duration: 0.8, ease: "power2.in" }, "+=0.15")
        .set(this.card, { display: "flex" }, "<")
        .fromTo(this.card, { y: 120, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" }, "<0.1")
        .set(this.envelope, { display: "none" })
        // Unfold the top half: the fold swings up from lying over the bottom half.
        .to(this.fold, { rotateX: 90, duration: 0.45, ease: "power1.in" })
        .set(this.card, { clipPath: "inset(0% 0 0 0)" })
        .to(this.fold, { rotateX: 0, duration: 0.5, ease: "power2.out" })
        .to(this.fold, { opacity: 0, duration: 0.25 })
        .add(() => this.onSound("sparkle"))
        .to(this.lines, { opacity: 1, y: 0, duration: 0.6, stagger: 0.22, ease: "sine.out" });
    });
  }

  private reset(): void {
    gsap.set(this.envelope, { clearProps: "all" });
    gsap.set(this.flap, { rotateX: 0, zIndex: 3 });
    gsap.set(this.seal, { scale: 1, opacity: 1 });
    gsap.set(this.card, { display: "none", clipPath: "inset(50% 0 0 0)", opacity: 0 });
    gsap.set(this.fold, { display: "block", rotateX: 180, opacity: 1 });
    gsap.set(this.lines, { opacity: 0, y: 6 });
    this.paper.scrollTop = 0;
    this.actions.replaceChildren();
  }
}
