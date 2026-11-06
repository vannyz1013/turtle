/**
 * Tracks the visitor's reduced-motion preference. With it on, camera flights become
 * gentle fades and idle movement is calmer. `?motion=reduced` forces it for testing.
 */
export class Motion {
  reduced: boolean;
  private readonly query = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly forced = new URLSearchParams(location.search).get("motion") === "reduced";

  constructor() {
    this.reduced = this.forced || this.query.matches;
    this.query.addEventListener("change", this.onChange);
  }

  /** 1 for full motion, smaller when the visitor prefers less movement. */
  get amount(): number {
    return this.reduced ? 0.35 : 1;
  }

  private onChange = (e: MediaQueryListEvent): void => {
    this.reduced = this.forced || e.matches;
  };

  dispose(): void {
    this.query.removeEventListener("change", this.onChange);
  }
}
