// Seeded randomness, so the garden grows the same way on every visit.
export type Rand = () => number;

export function createRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r: Rand, min: number, max: number): number => min + (max - min) * r();

export const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Hands out every item once, in random order, before repeating any. */
export class ShuffleBag<T> {
  private queue: T[] = [];
  private last: T | undefined;

  constructor(private readonly items: readonly T[]) {}

  next(): T {
    if (this.queue.length === 0) {
      this.queue = [...this.items];
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
      // Never show the same message twice in a row across refills.
      if (this.queue.length > 1 && this.queue[0] === this.last) this.queue.push(this.queue.shift() as T);
    }
    this.last = this.queue.shift() as T;
    return this.last;
  }
}
