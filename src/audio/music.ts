import { pad, piano } from "./voices";

interface Chord {
  bass: number;
  tones: number[];
}

// A gentle loop in F major, with a borrowed minor chord for a touch of nostalgia.
const PROGRESSION: Chord[] = [
  { bass: 41, tones: [57, 60, 64, 65, 69] }, // Fmaj7
  { bass: 45, tones: [55, 60, 64, 67, 72] }, // Am7
  { bass: 46, tones: [57, 62, 65, 69, 70] }, // Bbmaj7
  { bass: 48, tones: [55, 62, 64, 67, 72] }, // Cadd9
  { bass: 50, tones: [57, 60, 65, 69, 72] }, // Dm7
  { bass: 45, tones: [55, 60, 64, 67, 72] }, // Am7
  { bass: 46, tones: [57, 62, 65, 69, 70] }, // Bbmaj7
  { bass: 46, tones: [55, 61, 65, 67, 70] }, // Bbm6
];

const PATTERNS = [
  [0, 2, 1, 3, 4, 3, 2, 1],
  [0, 1, 2, 4, 3, 2, 1, 2],
  [1, 2, 3, 4, 2, 3, 1, 0],
];

const BPM = 66;
const EIGHTH = 60 / BPM / 2;

/** Original generative piano music: never quite the same twice, always calm. */
export class Music {
  private timer = 0;
  private step = 0;
  private next = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly dest: AudioNode,
  ) {}

  start(): void {
    if (this.timer) return;
    this.next = this.ctx.currentTime + 0.15;
    this.timer = window.setInterval(() => this.schedule(), 120);
    this.schedule();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  private schedule(): void {
    while (this.next < this.ctx.currentTime + 0.7) {
      this.play(this.step, this.next);
      this.step++;
      this.next += EIGHTH * (1 + (this.step % 2 === 1 ? 0.06 : -0.06)); // a little swing
    }
  }

  private play(step: number, time: number): void {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const pattern = PATTERNS[Math.floor(bar / PROGRESSION.length) % PATTERNS.length];

    if (beat === 0) {
      piano(this.ctx, this.dest, chord.bass, time, 0.11, 4);
      piano(this.ctx, this.dest, chord.bass + 12, time + 0.02, 0.05, 3);
      pad(this.ctx, this.dest, chord.tones.slice(0, 3).map((m) => m - 12), time, EIGHTH * 8 + 0.6);
    }
    if (beat === 4 && Math.random() < 0.5) piano(this.ctx, this.dest, chord.bass + 7, time, 0.05, 2.5);

    if (Math.random() < 0.86) {
      const note = chord.tones[pattern[beat]];
      piano(this.ctx, this.dest, note, time, 0.045 + Math.random() * 0.03);
    }
    // An occasional high melody note, sustained.
    if ((beat === 0 || beat === 5) && Math.random() < 0.35) {
      const top = chord.tones[2 + Math.floor(Math.random() * 3)] + 12;
      piano(this.ctx, this.dest, top, time + 0.01, 0.035, 3.5);
    }
  }
}
