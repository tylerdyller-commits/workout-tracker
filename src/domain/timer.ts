/**
 * Rest timer math. The timer stores only when it ends (epoch ms), so the time
 * left is always computed from the clock. It stays accurate even if the phone
 * locks or the app is in the background and the page stops ticking.
 */
export interface RestTimer {
  endsAt: number; // epoch ms
  durationSec: number; // total length of this rest (for the progress bar)
}

export function startTimer(durationSec: number, now: number): RestTimer {
  const d = Math.max(1, Math.round(durationSec));
  return { endsAt: now + d * 1000, durationSec: d };
}

/** Whole seconds left, rounded up (shows 0:01 until the very end). Never negative. */
export function remainingSec(t: RestTimer, now: number): number {
  return Math.max(0, Math.ceil((t.endsAt - now) / 1000));
}

export function isFinished(t: RestTimer, now: number): boolean {
  return now >= t.endsAt;
}

/** Fraction of the rest still left: 1 at the start, 0 at the end. */
export function fractionLeft(t: RestTimer, now: number): number {
  const f = (t.endsAt - now) / (t.durationSec * 1000);
  return Math.min(1, Math.max(0, f));
}

/** Adds (or with a negative delta, removes) time. It can't go below "ends now". */
export function adjustTimer(t: RestTimer, deltaSec: number, now: number): RestTimer {
  const endsAt = Math.max(now, t.endsAt + deltaSec * 1000);
  return { endsAt, durationSec: Math.max(1, t.durationSec + deltaSec) };
}

/** Reads a timer saved as JSON (e.g. in localStorage); null if missing or invalid. */
export function parseTimer(json: string | null): RestTimer | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json) as Partial<RestTimer>;
    if (
      typeof v.endsAt === 'number' &&
      Number.isFinite(v.endsAt) &&
      typeof v.durationSec === 'number' &&
      v.durationSec > 0
    ) {
      return { endsAt: v.endsAt, durationSec: v.durationSec };
    }
  } catch {
    // fall through
  }
  return null;
}
