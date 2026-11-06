import { el, wait } from "./dom";

export interface PanelAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
}

export interface PanelContent {
  eyebrow?: string;
  title?: string;
  /** "hero" for the big opening and closing titles. */
  size?: "hero" | "normal";
  text?: string;
  actions?: PanelAction[];
  placement?: "top" | "bottom" | "center";
}

/** The frosted caption card that carries each scene's words and buttons. */
export class Panel {
  readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private readonly actionsEl: HTMLElement;
  private readonly textEl: HTMLParagraphElement;
  private visible = false;
  private token = 0;

  constructor(parent: HTMLElement) {
    this.textEl = el("p", { class: "panel-text" });
    this.actionsEl = el("div", { class: "panel-actions" });
    this.body = el("div", { class: "panel-body" });
    this.el = el("section", { class: "panel", attrs: { "aria-live": "polite" } }, [this.body]);
    parent.append(this.el);
  }

  async show(c: PanelContent): Promise<void> {
    const token = ++this.token;
    if (this.visible) {
      this.el.classList.remove("is-visible");
      await wait(320);
      if (token !== this.token) return;
    }
    this.body.replaceChildren(
      ...[
        c.eyebrow ? el("p", { class: "panel-eyebrow", text: c.eyebrow }) : null,
        c.title ? el(c.size === "hero" ? "h1" : "h2", { class: `panel-title ${c.size === "hero" ? "is-hero" : ""}`, text: c.title }) : null,
        c.text ? this.textEl : null,
        this.actionsEl,
      ].filter((n): n is HTMLElement => !!n),
    );
    this.textEl.textContent = c.text ?? "";
    this.setActions(c.actions ?? []);
    this.el.dataset.placement = c.placement ?? "bottom";
    this.el.dataset.size = c.size ?? "normal";
    // Next frame, so the entrance transition runs.
    requestAnimationFrame(() => {
      if (token !== this.token) return;
      this.el.classList.add("is-visible");
      this.visible = true;
    });
  }

  setText(text: string): void {
    this.textEl.textContent = text;
  }

  setActions(actions: PanelAction[]): void {
    this.actionsEl.replaceChildren(
      ...actions.map((a) => {
        const b = el("button", { class: `btn ${a.variant === "ghost" ? "btn-ghost" : "btn-primary"}`, text: a.label, attrs: { type: "button" } });
        b.addEventListener("click", () => a.onClick());
        return b;
      }),
    );
    this.actionsEl.hidden = actions.length === 0;
  }

  async hide(): Promise<void> {
    ++this.token;
    if (!this.visible) return;
    this.visible = false;
    this.el.classList.remove("is-visible");
    await wait(320);
  }
}
