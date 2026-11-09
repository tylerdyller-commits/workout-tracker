import type { ExerciseType, PresetItem, SetLog } from './types';

export type SetValues = Pick<SetLog, 'weightLb' | 'reps' | 'timeSec' | 'distance'>;
export type SetField = keyof SetValues;

/** The fields a set logs for each exercise type (required first, then optional). */
export const FIELDS: Record<ExerciseType, SetField[]> = {
  weighted: ['weightLb', 'reps'],
  bodyweight: ['reps', 'weightLb'],
  timed: ['timeSec', 'weightLb'],
  carry: ['weightLb', 'distance'],
  distance: ['distance', 'weightLb'],
  cardio: ['timeSec', 'distance'],
};

function pick(type: ExerciseType, src: SetValues): SetValues {
  const out: SetValues = {};
  for (const f of FIELDS[type]) {
    const v = src[f];
    if (v != null) out[f] = v;
  }
  return out;
}

function fromTargets(target: PresetItem): SetValues {
  return {
    weightLb: target.targetWeightLb,
    reps: target.targetReps,
    timeSec: target.targetTimeSec,
    distance: target.targetDistance,
  };
}

/**
 * Values to pre-fill a new set with, in this order:
 *   1. the same set number from the last session of this exercise,
 *   2. else the previous set in this workout,
 *   3. else the preset targets,
 *   4. else nothing.
 * Only the fields that the exercise type logs are returned.
 */
export function prefillSet(opts: {
  type: ExerciseType;
  setIndex: number; // 0-based
  lastSession?: SetLog[]; // done sets from the previous session, in order
  currentSets: SetLog[]; // sets already in this workout entry
  target?: PresetItem;
}): SetValues {
  const { type, setIndex, lastSession, currentSets, target } = opts;
  const last = lastSession?.[setIndex];
  if (last) return pick(type, last);
  const prev = setIndex > 0 ? currentSets[setIndex - 1] : undefined;
  if (prev) return pick(type, prev);
  if (target) return pick(type, fromTargets(target));
  return {};
}
