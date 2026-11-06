import { Object3D, Vector3, type Camera } from "three";
import { el } from "./dom";

/**
 * A speech bubble or wish card pinned to a point in the 3D world. It follows the point
 * on screen every frame and stays inside the viewport edges.
 */
export class WorldLabel {
  readonly el: HTMLElement;
  private readonly inner: HTMLElement;
  private readonly textEl: HTMLElement;
  private anchor: Object3D | Vector3 | null = null;
  private offsetY = 0;
  private timer = 0;
  private shown = false;
  private readonly v = new Vector3();

  constructor(
    parent: HTMLElement,
    private readonly camera: Camera,
    variant: "speech" | "wish",
    /** An element this label must never cover (the caption panel). */
    private readonly avoid?: HTMLElement,
  ) {
    this.textEl = el("span", { class: "label-text" });
    this.inner = el("div", { class: "label-inner" }, [variant === "wish" ? el("span", { class: "label-spark", text: "✦", attrs: { "aria-hidden": "true" } }) : null, this.textEl]);
    this.el = el("div", { class: `world-label is-${variant}`, attrs: { role: "status", "aria-live": "polite" } }, [this.inner]);
    parent.append(this.el);
  }

  show(text: string, anchor: Object3D | Vector3, opts: { offsetY?: number; duration?: number } = {}): void {
    clearTimeout(this.timer);
    this.anchor = anchor;
    this.offsetY = opts.offsetY ?? 0;
    this.textEl.textContent = text;
    this.shown = true;
    this.el.classList.add("is-visible");
    // Restart the pop animation.
    this.inner.classList.remove("pop");
    void this.inner.offsetWidth;
    this.inner.classList.add("pop");
    this.update();
    if (opts.duration) this.timer = window.setTimeout(() => this.hide(), opts.duration);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.shown = false;
    this.el.classList.remove("is-visible");
  }

  update(): void {
    if (!this.shown || !this.anchor) return;
    if (this.anchor instanceof Vector3) this.v.copy(this.anchor);
    else this.anchor.getWorldPosition(this.v);
    this.v.y += this.offsetY;
    this.v.project(this.camera);
    const behind = this.v.z > 1;
    this.el.style.visibility = behind ? "hidden" : "";
    if (behind) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const half = this.el.offsetWidth / 2;
    const margin = 12;
    const x = Math.min(w - margin - half, Math.max(margin + half, ((this.v.x + 1) / 2) * w));
    let y = Math.min(h - margin, Math.max(margin + this.el.offsetHeight, ((1 - this.v.y) / 2) * h));
    y = this.dodge(x, y, half, margin, h);
    this.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  /** Moves the label (bottom edge at `y`) out from under the panel, below or above it. */
  private dodge(x: number, y: number, half: number, margin: number, h: number): number {
    if (!this.avoid?.classList.contains("is-visible")) return y;
    // Horizontal extent from the live box; vertical from the layout box, which ignores the
    // panel's slide-in transform, so the label dodges the panel's final position at once.
    const r = this.avoid.getBoundingClientRect();
    const top = this.avoid.offsetTop;
    const bottom = top + this.avoid.offsetHeight;
    const lh = this.el.offsetHeight;
    const overlaps = x + half > r.left && x - half < r.right && y > top && y - lh < bottom;
    if (!overlaps) return y;
    const below = bottom + 8 + lh;
    if (below <= h - margin) return below;
    return Math.max(margin + lh, top - 8);
  }
}
