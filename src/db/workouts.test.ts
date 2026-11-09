import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { createExercise, createPreset, newPresetItem, updatePreset } from './queries';
import {
  addExerciseToWorkout,
  addSet,
  finishWorkout,
  getActiveWorkout,
  removeSet,
  setDone,
  startWorkout,
  updateSet,
} from './workouts';
import type { Exercise } from '../domain/types';

let squat: Exercise;
let run: Exercise;

beforeEach(async () => {
  await db.delete();
  await db.open();
  squat = await createExercise({ name: 'Back Squat', type: 'weighted' });
  run = await createExercise({ name: 'Run', type: 'cardio' });
});

async function presetWithSquat() {
  const p = await createPreset('Legs');
  await updatePreset(p.id, {
    items: [
      { ...newPresetItem(squat), targetReps: 5, targetWeightLb: 200 },
      { ...newPresetItem(run), targetDistance: 1 },
    ],
  });
  return p.id;
}

describe('workouts', () => {
  it('starts from a preset with pre-filled sets and marks the preset used', async () => {
    const pid = await presetWithSquat();
    const w = await startWorkout(pid);
    expect(w.name).toBe('Legs');
    expect(w.entries.map((e) => e.sets.length)).toEqual([3, 1]);
    expect(w.entries[0].sets[0]).toMatchObject({ weightLb: 200, reps: 5, done: false });
    expect(w.entries[1].sets[0]).toMatchObject({ distance: 1 });
    expect((await db.presets.get(pid))?.lastUsedAt).toBeGreaterThan(0);
  });

  it('only allows one workout in progress', async () => {
    const a = await startWorkout();
    const b = await startWorkout(await presetWithSquat());
    expect(b.id).toBe(a.id);
    expect(await db.workouts.count()).toBe(1);
    expect((await getActiveWorkout())?.name).toBe('Quick workout');
  });

  it('finish drops undone sets and empty exercises, and next time pre-fills from it', async () => {
    const pid = await presetWithSquat();
    const w = await startWorkout(pid);
    const e = w.entries[0];
    await updateSet(w.id, e.id, e.sets[0].id, { weightLb: 225 });
    await setDone(w.id, e.id, e.sets[0].id, true);
    await setDone(w.id, e.id, e.sets[1].id, true);
    const summary = await finishWorkout(w.id);
    expect(summary).toMatchObject({ saved: true, setsDone: 2, exercises: 1, newMaxes: [] });
    const saved = await db.workouts.get(w.id);
    expect(saved?.endedAt).toBeDefined();
    expect(saved?.entries).toHaveLength(1);
    expect(saved?.entries[0].sets.map((s) => s.weightLb)).toEqual([225, 200]);
    expect(saved?.entries[0].sets[0].completedAt).toBeDefined();

    // next session: set 1 & 2 from last time, set 3 from the previous set
    const w2 = await startWorkout(pid);
    expect(w2.entries[0].sets.map((s) => s.weightLb)).toEqual([225, 200, 200]);
  });

  it('reports a new max only when beating earlier sessions', async () => {
    const pid = await presetWithSquat();
    for (const weight of [200, 250]) {
      const w = await startWorkout(pid);
      const e = w.entries[0];
      await updateSet(w.id, e.id, e.sets[0].id, { weightLb: weight });
      await setDone(w.id, e.id, e.sets[0].id, true);
      const s = await finishWorkout(w.id);
      if (weight === 200) expect(s?.newMaxes).toEqual([]);
      else
        expect(s?.newMaxes.map((m) => [m.exercise.name, m.value])).toEqual([['Back Squat', 250]]);
    }
  });

  it('finishing with nothing done saves nothing', async () => {
    const w = await startWorkout();
    const s = await finishWorkout(w.id);
    expect(s?.saved).toBe(false);
    expect(await db.workouts.count()).toBe(0);
  });

  it('adds exercises and sets, removes sets', async () => {
    const w = await startWorkout();
    const entryId = await addExerciseToWorkout(w.id, squat);
    await addSet(w.id, entryId);
    let cur = await db.workouts.get(w.id);
    expect(cur?.entries[0].sets).toHaveLength(4);
    await removeSet(w.id, entryId, cur!.entries[0].sets[0].id);
    cur = await db.workouts.get(w.id);
    expect(cur?.entries[0].sets).toHaveLength(3);
  });

  it('applies rapid changes in order without losing any', async () => {
    const w = await startWorkout(await presetWithSquat());
    const e = w.entries[0];
    await Promise.all([
      updateSet(w.id, e.id, e.sets[0].id, { reps: 6 }),
      setDone(w.id, e.id, e.sets[1].id, true),
      updateSet(w.id, e.id, e.sets[2].id, { weightLb: 230 }),
    ]);
    const cur = await db.workouts.get(w.id);
    expect(cur?.entries[0].sets[0].reps).toBe(6);
    expect(cur?.entries[0].sets[1].done).toBe(true);
    expect(cur?.entries[0].sets[2].weightLb).toBe(230);
  });
});
