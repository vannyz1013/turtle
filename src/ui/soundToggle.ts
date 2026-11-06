import { greeting } from "@edition/greeting";
import { el } from "./dom";

const ICON_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor" stroke-linejoin="round"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor" stroke-linejoin="round"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/** The music button. Music never starts on its own: only when this is pressed. */
export class SoundToggle {
  readonly el: HTMLButtonElement;
  private on = false;
  private readonly icon: HTMLElement;
  private readonly label: HTMLElement;

  constructor(parent: HTMLElement, onChange: (on: boolean) => void) {
    this.icon = el("span", { class: "sound-icon" });
    this.label = el("span", { class: "sound-label" });
    this.el = el("button", { class: "sound-toggle", attrs: { type: "button", "aria-pressed": "false" } }, [this.icon, this.label]);
    this.el.addEventListener("click", () => {
      this.on = !this.on;
      this.render();
      onChange(this.on);
    });
    this.render();
    parent.append(this.el);
  }

  private render(): void {
    this.icon.innerHTML = this.on ? ICON_ON : ICON_OFF; // static, trusted SVG
    this.label.textContent = this.on ? greeting.sound.on : greeting.sound.off;
    this.el.setAttribute("aria-pressed", String(this.on));
    this.el.setAttribute("aria-label", this.on ? "Turn music off" : "Turn music on");
  }
}
