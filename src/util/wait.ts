export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * Collects timers and clean-up callbacks for one story chapter, so nothing
 * scheduled in a chapter can fire after the visitor has moved on.
 */
export class Scope {
  private alive = true;
  private readonly timers = new Set<number>();
  private readonly disposers: Array<() => void> = [];

  get active(): boolean {
    return this.alive;
  }

  timeout(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (this.alive) fn();
    }, ms);
    this.timers.add(id);
  }

  interval(fn: () => void, ms: number): void {
    const id = window.setInterval(() => {
      if (this.alive) fn();
    }, ms);
    this.disposers.push(() => clearInterval(id));
  }

  add(dispose: () => void): void {
    this.disposers.push(dispose);
  }

  dispose(): void {
    this.alive = false;
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
    this.disposers.splice(0).forEach((d) => d());
  }
}
