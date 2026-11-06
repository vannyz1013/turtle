import { Camera, Object3D, Raycaster, Vector2 } from "three";

export interface PickHandlers {
  onClick: () => void;
  onHover?: (over: boolean) => void;
}

export interface PickHandle {
  setEnabled(enabled: boolean): void;
  remove(): void;
}

interface Entry extends PickHandlers {
  proxy: Object3D;
  enabled: boolean;
}

/**
 * Hover and tap detection for 3D objects. Each interactive thing registers an invisible,
 * generous "proxy" shape, so taps are forgiving on phones and raycasts stay cheap.
 */
export class Picker {
  private readonly entries: Entry[] = [];
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private hovered: Entry | null = null;
  private down: { x: number; y: number; t: number } | null = null;

  constructor(
    private readonly dom: HTMLElement,
    private readonly camera: Camera,
  ) {
    dom.addEventListener("pointermove", this.onMove);
    dom.addEventListener("pointerdown", this.onDown);
    dom.addEventListener("pointerup", this.onUp);
    dom.addEventListener("pointerleave", this.onLeave);
  }

  add(proxy: Object3D, handlers: PickHandlers): PickHandle {
    const entry: Entry = { proxy, enabled: true, ...handlers };
    this.entries.push(entry);
    return {
      setEnabled: (enabled) => {
        entry.enabled = enabled;
        if (!enabled && this.hovered === entry) this.setHovered(null);
      },
      remove: () => {
        if (this.hovered === entry) this.setHovered(null);
        const i = this.entries.indexOf(entry);
        if (i >= 0) this.entries.splice(i, 1);
      },
    };
  }

  private pick(clientX: number, clientY: number): Entry | null {
    const active = this.entries.filter((e) => e.enabled && shown(e.proxy));
    if (active.length === 0) return null;
    const rect = this.dom.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(
      active.map((e) => e.proxy),
      false,
    )[0];
    return hit ? (active.find((e) => e.proxy === hit.object) ?? null) : null;
  }

  private setHovered(entry: Entry | null): void {
    if (entry === this.hovered) return;
    this.hovered?.onHover?.(false);
    this.hovered = entry;
    entry?.onHover?.(true);
    this.dom.style.cursor = entry ? "pointer" : "";
  }

  private onMove = (e: PointerEvent): void => {
    if (e.pointerType === "mouse") this.setHovered(this.pick(e.clientX, e.clientY));
  };

  private onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onUp = (e: PointerEvent): void => {
    const d = this.down;
    this.down = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 900) return;
    const entry = this.pick(e.clientX, e.clientY);
    if (!entry) return;
    if (e.pointerType !== "mouse") {
      // A short hover pulse on touch, so taps still get visual feedback.
      entry.onHover?.(true);
      setTimeout(() => entry.onHover?.(false), 450);
    }
    entry.onClick();
  };

  private onLeave = (): void => this.setHovered(null);

  dispose(): void {
    this.dom.removeEventListener("pointermove", this.onMove);
    this.dom.removeEventListener("pointerdown", this.onDown);
    this.dom.removeEventListener("pointerup", this.onUp);
    this.dom.removeEventListener("pointerleave", this.onLeave);
    this.entries.length = 0;
  }
}

/** True when the proxy and all its parents are visible. Proxies themselves use invisible materials. */
function shown(obj: Object3D): boolean {
  for (let o: Object3D | null = obj.parent; o; o = o.parent) if (!o.visible) return false;
  return true;
}
