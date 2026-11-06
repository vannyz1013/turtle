// Small synthesised instruments. Everything is generated with the Web Audio API,
// so there are no audio files and no licensing questions.

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** A soft felt-piano-like note: a few sine partials with a quick attack and long decay. */
export function piano(ctx: AudioContext, dest: AudioNode, midi: number, time: number, velocity: number, length = 2.6): void {
  const f = midiToHz(midi);
  const out = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(5200, 900 + f * 2.2);
  filter.Q.value = 0.3;
  out.connect(filter).connect(dest);

  out.gain.setValueAtTime(0, time);
  out.gain.linearRampToValueAtTime(velocity, time + 0.012);
  out.gain.exponentialRampToValueAtTime(velocity * 0.32, time + 0.35);
  out.gain.exponentialRampToValueAtTime(0.0001, time + length);

  const partials: Array<[number, number]> = [
    [1, 1],
    [2, 0.32],
    [3, 0.1],
    [4.02, 0.04],
  ];
  for (const [ratio, amp] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f * ratio;
    osc.detune.value = (Math.random() - 0.5) * 4;
    g.gain.value = amp;
    osc.connect(g).connect(out);
    osc.start(time);
    osc.stop(time + length + 0.05);
    osc.onended = () => g.disconnect();
  }
  setTimeout(() => out.disconnect(), (time - ctx.currentTime + length + 0.3) * 1000);
}

/** A slow, airy pad chord underneath the piano. */
export function pad(ctx: AudioContext, dest: AudioNode, midis: number[], time: number, length: number, level = 0.03): void {
  const out = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  out.connect(filter).connect(dest);
  out.gain.setValueAtTime(0, time);
  out.gain.linearRampToValueAtTime(level, time + length * 0.4);
  out.gain.linearRampToValueAtTime(0, time + length);
  for (const m of midis) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = midiToHz(m);
      osc.detune.value = detune;
      osc.connect(out);
      osc.start(time);
      osc.stop(time + length + 0.05);
    }
  }
  setTimeout(() => out.disconnect(), (time - ctx.currentTime + length + 0.3) * 1000);
}

/** A tiny bell-like ping: sine plus a quiet inharmonic overtone. */
export function chime(ctx: AudioContext, dest: AudioNode, midi: number, time: number, velocity = 0.12): void {
  const f = midiToHz(midi);
  const g = ctx.createGain();
  g.connect(dest);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(velocity, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
  for (const [ratio, amp] of [
    [1, 1],
    [2.76, 0.25],
  ]) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.frequency.value = f * ratio;
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(time);
    o.stop(time + 1.25);
  }
  setTimeout(() => g.disconnect(), (time - ctx.currentTime + 1.5) * 1000);
}

let noise: AudioBuffer | null = null;

/** Filtered noise: a soft whoosh or a paper rustle. */
export function breath(ctx: AudioContext, dest: AudioNode, time: number, length: number, from: number, to: number, level: number): void {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, time);
  filter.frequency.exponentialRampToValueAtTime(to, time + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(level, time + length * 0.35);
  g.gain.linearRampToValueAtTime(0, time + length);
  src.connect(filter).connect(g).connect(dest);
  src.start(time);
  src.stop(time + length + 0.05);
  src.onended = () => g.disconnect();
}
