import type { ExerciseType, SetLog } from './types';

export type CardioMetric = 'distance' | 'time';

/**
 * The number that a session max is measured by, per type:
 * weighted → weight, bodyweight → reps, timed → time, carry → weight,
 * distance → distance, cardio → distance (or time with the toggle).
 */
export function metricValue(
  type: ExerciseType,
  set: SetLog,
  cardio: CardioMetric = 'distance',
): number | undefined {
  switch (type) {
    case 'weighted':
    case 'carry':
      return set.weightLb;
    case 'bodyweight':
      return set.reps;
    case 'timed':
      return set.timeSec;
    case 'distance':
      return set.distance;
    case 'cardio':
      return cardio === 'time' ? set.timeSec : set.distance;
  }
}

/** Secondary value used to break ties (e.g. more reps at the same weight). */
function tieBreak(type: ExerciseType, set: SetLog): number {
  switch (type) {
    case 'weighted':
      return set.reps ?? 0;
    case 'bodyweight':
    case 'timed':
    case 'distance':
      return set.weightLb ?? 0;
    case 'carry':
      return set.distance ?? 0;
    case 'cardio':
      return 0;
  }
}

export interface SessionMax {
  value: number;
  set: SetLog; // the set that holds the max (for tooltip extras)
}

/** The best done set of a session by the type's metric, or undefined if none. */
export function sessionMax(
  type: ExerciseType,
  sets: SetLog[],
  cardio: CardioMetric = 'distance',
): SessionMax | undefined {
  let best: SessionMax | undefined;
  for (const set of sets) {
    if (!set.done) continue;
    const v = metricValue(type, set, cardio);
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    if (
      !best ||
      v > best.value ||
      (v === best.value && tieBreak(type, set) > tieBreak(type, best.set))
    ) {
      best = { value: v, set };
    }
  }
  return best;
}
