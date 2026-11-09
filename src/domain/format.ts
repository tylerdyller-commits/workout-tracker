import type { DistUnit, Exercise, ExerciseType, Preset, PresetItem, SetLog } from './types';

/** Seconds → "m:ss", or "h:mm:ss" when an hour or more. */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * Parses typed time: "m:ss", "h:mm:ss", or digits only. The iPhone number pad
 * has no ":" key, so digits are read like a microwave timer: the last two are
 * seconds, the two before are minutes, the rest hours ("130" → 1:30,
 * "4500" → 45:00, "13000" → 1:30:00, "90" → 1:30).
 * Returns undefined for anything that isn't a valid time.
 */
export function parseDuration(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (/^\d+$/.test(t)) {
    const sec = Number(t.slice(-2));
    const min = Number(t.slice(-4, -2) || 0);
    const hr = Number(t.slice(0, -4) || 0);
    return hr * 3600 + min * 60 + sec;
  }
  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return undefined;
  }
  const nums = parts.map(Number);
  // seconds (and minutes when hours are given) must be 0–59
  if (nums[nums.length - 1] > 59) return undefined;
  if (nums.length === 3 && nums[1] > 59) return undefined;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** Trims needless trailing zeros: 5 → "5", 2.5 → "2.5". */
export function formatNumber(n: number, maxDecimals = 2): string {
  return String(Number(n.toFixed(maxDecimals)));
}

export function formatWeight(lb: number): string {
  return `${formatNumber(lb)} lb`;
}

/** Miles always show 2 decimals; ft/yd show whole numbers when possible. */
export function formatDistance(d: number, unit: DistUnit): string {
  return unit === 'mi' ? `${d.toFixed(2)} mi` : `${formatNumber(d)} ${unit}`;
}

/** The distance unit an exercise uses (cardio is always miles). */
export function distUnitFor(ex: Pick<Exercise, 'type' | 'distUnit'>): DistUnit {
  if (ex.type === 'cardio') return 'mi';
  return ex.distUnit === 'ft' ? 'ft' : 'yd';
}

/** Default number of target sets for a new preset item. */
export function defaultTargetSets(type: ExerciseType): number {
  return type === 'cardio' ? 1 : 3;
}

/**
 * One-line summary of a preset item's targets, e.g. "3 × 5 @ 225 lb",
 * "3 × 40 yd @ 70 lb", "1 × 2.00 mi · 20:00", "3 × 1:00", "3 × 8 @ +25 lb".
 * Appends " · rest m:ss" when the item overrides the default rest.
 */
export function targetSummary(item: PresetItem, ex: Pick<Exercise, 'type' | 'distUnit'>): string {
  const unit = distUnitFor(ex);
  const sets = item.targetSets;
  const dist = item.targetDistance != null ? formatDistance(item.targetDistance, unit) : undefined;
  const time = item.targetTimeSec != null ? formatDuration(item.targetTimeSec) : undefined;
  const reps = item.targetReps != null ? String(item.targetReps) : undefined;
  const w = item.targetWeightLb;

  let main: string | undefined;
  let weight = '';
  let extra = '';
  switch (ex.type) {
    case 'weighted':
      main = reps;
      if (w != null) weight = ` @ ${formatWeight(w)}`;
      break;
    case 'bodyweight':
      main = reps;
      if (w) weight = ` @ +${formatWeight(w)}`;
      break;
    case 'timed':
      main = time;
      if (w) weight = ` @ ${formatWeight(w)}`;
      break;
    case 'carry':
      main = dist;
      if (w != null) weight = ` @ ${formatWeight(w)}`;
      break;
    case 'distance':
      main = dist;
      if (w) weight = ` @ ${formatWeight(w)}`;
      break;
    case 'cardio':
      main = dist ?? time;
      if (dist && time) extra = ` · ${time}`;
      break;
  }

  const head = main ? `${sets} × ${main}` : `${sets} ${sets === 1 ? 'set' : 'sets'}`;
  const rest = item.restSec != null ? ` · rest ${formatDuration(item.restSec)}` : '';
  return `${head}${weight}${extra}${rest}`;
}

/** "Nov 6" */
export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Fri, Nov 6" */
export function formatDayDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "6 exercises · Last done Nov 6" */
export function presetMeta(p: Pick<Preset, 'items' | 'lastUsedAt'>): string {
  const n = p.items.length;
  const count = `${n} ${n === 1 ? 'exercise' : 'exercises'}`;
  return p.lastUsedAt ? `${count} · Last done ${formatShortDate(p.lastUsedAt)}` : count;
}

/** Cardio pace: seconds per mile as "m:ss /mi". Undefined without both values. */
export function formatPace(timeSec?: number, distanceMi?: number): string | undefined {
  if (!timeSec || !distanceMi || distanceMi <= 0 || timeSec <= 0) return undefined;
  return `${formatDuration(timeSec / distanceMi)} /mi`;
}

type SetVals = Pick<SetLog, 'weightLb' | 'reps' | 'timeSec' | 'distance'>;

/**
 * A set as one line for set rows, e.g. "225 lb × 5", "8 reps +25 lb", "1:00",
 * "70 lb × 40 yd", "20 yd @ 180 lb", "1.00 mi · 9:30". Missing values show "—".
 */
export function setSummary(set: SetVals, ex: Pick<Exercise, 'type' | 'distUnit'>): string {
  const unit = distUnitFor(ex);
  const w = set.weightLb != null ? formatWeight(set.weightLb) : '— lb';
  const d = set.distance != null ? formatDistance(set.distance, unit) : `— ${unit}`;
  const t = set.timeSec != null ? formatDuration(set.timeSec) : '—:——';
  const r = set.reps != null ? String(set.reps) : '—';
  switch (ex.type) {
    case 'weighted':
      return `${w} × ${r}`;
    case 'bodyweight':
      return `${r} reps${set.weightLb ? ` +${formatWeight(set.weightLb)}` : ''}`;
    case 'timed':
      return `${t}${set.weightLb ? ` @ ${formatWeight(set.weightLb)}` : ''}`;
    case 'carry':
      return `${w} × ${d}`;
    case 'distance':
      return `${d}${set.weightLb ? ` @ ${formatWeight(set.weightLb)}` : ''}`;
    case 'cardio':
      return `${d} · ${t}`;
  }
}

/** A set in compact form for the "Last time" line, e.g. "225×5", "+25×8", "1.00 mi in 9:30". */
export function setShort(set: SetVals, ex: Pick<Exercise, 'type' | 'distUnit'>): string {
  const unit = distUnitFor(ex);
  const n = (v?: number) => (v != null ? formatNumber(v) : '—');
  switch (ex.type) {
    case 'weighted':
      return `${n(set.weightLb)}×${n(set.reps)}`;
    case 'bodyweight':
      return set.weightLb ? `+${n(set.weightLb)}×${n(set.reps)}` : `${n(set.reps)}`;
    case 'timed':
    case 'carry':
    case 'distance':
      return setSummary(set, ex);
    case 'cardio': {
      const parts = [
        set.distance != null ? formatDistance(set.distance, unit) : undefined,
        set.timeSec != null ? `in ${formatDuration(set.timeSec)}` : undefined,
      ].filter(Boolean);
      const pace = formatPace(set.timeSec, set.distance);
      return parts.join(' ') + (pace ? ` · ${pace}` : '');
    }
  }
}

/** "Last: 225×5 · 225×5 · 225×4" style list of sets. */
export function lastTimeLine(sets: SetVals[], ex: Pick<Exercise, 'type' | 'distUnit'>): string {
  return sets.map((s) => setShort(s, ex)).join(' · ');
}
