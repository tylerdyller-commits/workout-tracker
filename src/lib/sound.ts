/**
 * Short beep through Web Audio. iOS only allows audio after a user tap, so
 * unlockAudio() must be called from a tap handler once (we do it on the first
 * tap anywhere). Note: iOS mutes Web Audio when the ring/silent switch is on
 * silent. Everything fails silently.
 */
let ctx: AudioContext | null = null;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    // playing a silent buffer inside the tap fully unlocks audio on iOS
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

/** Three short high beeps. */
export function beep(): void {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const start = t0 + i * 0.25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    }
  } catch {
    // ignore
  }
}
