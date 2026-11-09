import { db } from './schema';
import { defaultTargetSets } from '../domain/format';
import { sessionMax } from '../domain/metrics';
import { prefillSet, type SetValues } from '../domain/prefill';
import type { Exercise, PresetItem, SetLog, Workout, WorkoutEntry } from '../domain/types';

export const QUICK_WORKOUT_NAME = 'Quick workout';

/** The workout in progress (no endedAt), if any. Only one may exist. */
export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.filter((w) => w.endedAt == null).first();
}

export interface LastSession {
  workoutId: string;
  date: number;
  sets: SetLog[]; // done sets, in order
}

/**
 * For each exercise, its most recent finished session (excluding `excludeId`).
 * One pass over history; fine for a personal log.
 */
export async function lastSessions(excludeId?: string): Promise<Map<string, LastSession>> {
  const finished = await db.workouts.orderBy('startedAt').reverse().toArray();
  const map = new Map<string, LastSession>();
  for (const w of finished) {
    if (w.endedAt == null || w.id === excludeId) continue;
    for (const e of w.entries) {
      if (map.has(e.exerciseId)) continue;
      const sets = e.sets.filter((s) => s.done);
      if (sets.length) map.set(e.exerciseId, { workoutId: w.id, date: w.startedAt, sets });
    }
  }
  return map;
}

function makeSet(values: SetValues): SetLog {
  const s: SetLog = { id: crypto.randomUUID(), done: false };
  for (const [k, v] of Object.entries(values) as [keyof SetValues, number | undefined][]) {
    if (v != null) s[k] = v;
  }
  return s;
}

/** Builds an entry with pre-filled sets for an exercise. */
function makeEntry(ex: Exercise, last: LastSession | undefined, item?: PresetItem): WorkoutEntry {
  const count = item?.targetSets ?? (last?.sets.length || defaultTargetSets(ex.type));
  const sets: SetLog[] = [];
  for (let i = 0; i < count; i++) {
    sets.push(
      makeSet(
        prefillSet({
          type: ex.type,
          setIndex: i,
          lastSession: last?.sets,
          currentSets: sets,
          target: item,
        }),
      ),
    );
  }
  return {
    id: crypto.randomUUID(),
    exerciseId: ex.id,
    ...(item ? { presetItemId: item.id } : {}),
    sets,
  };
}

/**
 * Starts a workout from a preset, or an empty Quick workout. If a workout is
 * already in progress, returns that one instead (only one at a time).
 */
export async function startWorkout(presetId?: string): Promise<Workout> {
  return db.transaction('rw', db.workouts, db.presets, db.exercises, async () => {
    const active = await getActiveWorkout();
    if (active) return active;
    const now = Date.now();
    const preset = presetId ? await db.presets.get(presetId) : undefined;
    const entries: WorkoutEntry[] = [];
    if (preset) {
      const last = await lastSessions();
      for (const item of preset.items) {
        const ex = await db.exercises.get(item.exerciseId);
        if (ex) entries.push(makeEntry(ex, last.get(ex.id), item));
      }
      await db.presets.update(preset.id, { lastUsedAt: now });
    }
    const w: Workout = {
      id: crypto.randomUUID(),
      name: preset?.name ?? QUICK_WORKOUT_NAME,
      ...(preset ? { presetId: preset.id } : {}),
      startedAt: now,
      entries,
    };
    await db.workouts.add(w);
    return w;
  });
}

/**
 * Applies a change to a workout inside a transaction, so changes made in
 * quick succession are applied in order to the latest saved copy.
 */
async function mutate(workoutId: string, fn: (w: Workout) => void): Promise<void> {
  await db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    fn(w);
    await db.workouts.put(w);
  });
}

function findEntry(w: Workout, entryId: string): WorkoutEntry | undefined {
  return w.entries.find((e) => e.id === entryId);
}

export function updateSet(
  workoutId: string,
  entryId: string,
  setId: string,
  values: Partial<SetValues>,
): Promise<void> {
  return mutate(workoutId, (w) => {
    const s = findEntry(w, entryId)?.sets.find((x) => x.id === setId);
    if (!s) return;
    for (const [k, v] of Object.entries(values) as [keyof SetValues, number | undefined][]) {
      if (v == null) delete s[k];
      else s[k] = v;
    }
  });
}

/** Marks a set done (stamping completedAt) or un-does it. */
export function setDone(
  workoutId: string,
  entryId: string,
  setId: string,
  done: boolean,
): Promise<void> {
  return mutate(workoutId, (w) => {
    const s = findEntry(w, entryId)?.sets.find((x) => x.id === setId);
    if (!s) return;
    s.done = done;
    if (done) s.completedAt = Date.now();
    else delete s.completedAt;
  });
}

export async function addSet(workoutId: string, entryId: string): Promise<void> {
  const w = await db.workouts.get(workoutId);
  const entry = w && findEntry(w, entryId);
  if (!entry) return;
  const ex = await db.exercises.get(entry.exerciseId);
  if (!ex) return;
  const last = (await lastSessions(workoutId)).get(ex.id);
  const preset = w.presetId ? await db.presets.get(w.presetId) : undefined;
  const item = preset?.items.find((i) => i.id === entry.presetItemId);
  await mutate(workoutId, (latest) => {
    const e = findEntry(latest, entryId);
    if (!e) return;
    e.sets.push(
      makeSet(
        prefillSet({
          type: ex.type,
          setIndex: e.sets.length,
          lastSession: last?.sets,
          currentSets: e.sets,
          target: item,
        }),
      ),
    );
  });
}

export function removeSet(workoutId: string, entryId: string, setId: string): Promise<void> {
  return mutate(workoutId, (w) => {
    const e = findEntry(w, entryId);
    if (e) e.sets = e.sets.filter((s) => s.id !== setId);
  });
}

/** Appends an exercise (with pre-filled sets) to the workout; returns the new entry id. */
export async function addExerciseToWorkout(workoutId: string, ex: Exercise): Promise<string> {
  const last = (await lastSessions(workoutId)).get(ex.id);
  const entry = makeEntry(ex, last);
  await mutate(workoutId, (w) => {
    w.entries.push(entry);
  });
  return entry.id;
}

export function removeEntry(workoutId: string, entryId: string): Promise<void> {
  return mutate(workoutId, (w) => {
    w.entries = w.entries.filter((e) => e.id !== entryId);
  });
}

export async function discardWorkout(workoutId: string): Promise<void> {
  await db.workouts.delete(workoutId);
}

export interface FinishSummary {
  saved: boolean; // false when no sets were done (nothing to keep)
  name: string;
  durationSec: number;
  setsDone: number;
  exercises: number;
  newMaxes: { exercise: Exercise; value: number }[];
}

/**
 * Finishes the workout: drops sets that weren't done and exercises with no
 * done sets, stamps endedAt and reports new maxes (beating every earlier
 * session of that exercise). A workout with no done sets is deleted.
 */
export async function finishWorkout(workoutId: string): Promise<FinishSummary | undefined> {
  return db.transaction('rw', db.workouts, db.exercises, async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return undefined;
    const now = Date.now();
    const entries = w.entries
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0);
    const setsDone = entries.reduce((n, e) => n + e.sets.length, 0);
    const base = {
      name: w.name,
      durationSec: Math.round((now - w.startedAt) / 1000),
      setsDone,
      exercises: entries.length,
    };
    if (setsDone === 0) {
      await db.workouts.delete(w.id);
      return { ...base, saved: false, newMaxes: [] };
    }

    // previous best per exercise, from earlier finished workouts
    const history = await db.workouts.filter((x) => x.endedAt != null && x.id !== w.id).toArray();
    const newMaxes: FinishSummary['newMaxes'] = [];
    for (const e of entries) {
      const ex = await db.exercises.get(e.exerciseId);
      if (!ex) continue;
      const mine = sessionMax(ex.type, e.sets);
      if (!mine) continue;
      let prev: number | undefined;
      for (const h of history) {
        for (const he of h.entries) {
          if (he.exerciseId !== ex.id) continue;
          const m = sessionMax(ex.type, he.sets)?.value;
          if (m != null && (prev == null || m > prev)) prev = m;
        }
      }
      // only a "new max" if there was something to beat
      if (prev != null && mine.value > prev) newMaxes.push({ exercise: ex, value: mine.value });
    }

    await db.workouts.put({ ...w, entries, endedAt: now });
    return { ...base, saved: true, newMaxes };
  });
}
