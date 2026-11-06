import { Music } from "./music";
import { breath, chime } from "./voices";

export type Sfx = "sparkle" | "pop" | "whoosh" | "bloom" | "boop" | "page";

const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];

/**
 * Owns the audio context. Off by default: nothing is created until the visitor turns
 * sound on (which is also the user gesture browsers require).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private music: Music | null = null;
  private enabled = false;
  private suspendTimer = 0;

  constructor() {
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  get on(): boolean {
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    clearTimeout(this.suspendTimer);
    if (on) {
      const ctx = this.ensure();
      void ctx.resume();
      this.master!.gain.cancelScheduledValues(ctx.currentTime);
      this.master!.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
      this.music!.start();
    } else if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      this.suspendTimer = window.setTimeout(() => {
        this.music?.stop();
        void this.ctx?.suspend();
      }, 900);
    }
  }

  play(kind: Sfx): void {
    if (!this.enabled || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const bus = this.sfxBus;
    const t = ctx.currentTime + 0.01;
    switch (kind) {
      case "sparkle":
        [0, 2, 4, 5].forEach((i, k) => chime(ctx, bus, PENTA[i] + 12, t + k * 0.07, 0.07));
        break;
      case "bloom": {
        const base = Math.floor(Math.random() * 4);
        chime(ctx, bus, PENTA[base], t, 0.1);
        chime(ctx, bus, PENTA[base + 2], t + 0.09, 0.08);
        chime(ctx, bus, PENTA[base + 4], t + 0.18, 0.06);
        break;
      }
      case "pop": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(320, t);
        o.frequency.exponentialRampToValueAtTime(760, t + 0.13);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 0.3);
        [2, 4, 6].forEach((i, k) => chime(ctx, bus, PENTA[i] + 12, t + 0.12 + k * 0.08, 0.06));
        break;
      }
      case "whoosh":
        breath(ctx, bus, t, 1.6, 300, 2400, 0.18);
        [0, 3, 5, 7].forEach((i, k) => chime(ctx, bus, PENTA[i], t + 0.4 + k * 0.12, 0.05));
        break;
      case "boop":
        chime(ctx, bus, 81, t, 0.08);
        chime(ctx, bus, 88, t + 0.09, 0.07);
        break;
      case "page":
        breath(ctx, bus, t, 0.45, 2500, 5000, 0.08);
        break;
    }
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    // A soft, generated reverb for a sense of space.
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    reverb.connect(wet).connect(master);

    const musicBus = ctx.createGain();
    musicBus.gain.value = 0.9;
    musicBus.connect(master);
    musicBus.connect(reverb);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    sfxBus.connect(reverb);

    this.ctx = ctx;
    this.master = master;
    this.sfxBus = sfxBus;
    this.music = new Music(ctx, musicBus);
    return ctx;
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  private onVisibility = (): void => {
    if (!this.ctx || !this.enabled) return;
    if (document.hidden) {
      this.music?.stop();
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
      this.music?.start();
    }
  };

  dispose(): void {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.music?.stop();
    void this.ctx?.close();
  }
}
