import { greeting } from "@edition/greeting";
import { el, wait } from "./dom";

/** The opening screen: a slowly turning sun and a real progress bar. */
export class Loader {
  readonly el: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly pct: HTMLElement;
  private readonly track: HTMLElement;
  private value = 0;

  constructor(parent: HTMLElement) {
    const sun = el("div", { class: "loader-sun", attrs: { "aria-hidden": "true" } }, [el("span", { class: "loader-rays" }), el("span", { class: "loader-core" })]);
    this.bar = el("span", { class: "loader-fill" });
    this.track = el("div", { class: "loader-track", attrs: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", "aria-label": "Loading" } }, [this.bar]);
    this.pct = el("p", { class: "loader-note", text: greeting.loading });
    this.el = el("div", { class: "loader" }, [sun, el("p", { class: "loader-title", text: greeting.title }), this.track, this.pct]);
    parent.append(this.el);
  }

  set(p: number): void {
    this.value = Math.max(this.value, Math.min(1, p));
    const n = Math.round(this.value * 100);
    this.bar.style.transform = `scaleX(${this.value})`;
    this.track.setAttribute("aria-valuenow", String(n));
    this.pct.textContent = `${greeting.loading} ${n}%`;
  }

  async done(): Promise<void> {
    this.set(1);
    await wait(250);
    this.el.classList.add("is-done");
    await wait(900);
    this.el.remove();
  }
}
