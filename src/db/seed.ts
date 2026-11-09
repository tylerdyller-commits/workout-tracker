import { db } from './schema';
import { DEFAULT_SETTINGS, type DistUnit, type Exercise, type ExerciseType } from '../domain/types';

export const SEED_EXERCISES: ReadonlyArray<{
  name: string;
  type: ExerciseType;
  distUnit?: DistUnit;
}> = [
  { name: 'Back Squat', type: 'weighted' },
  { name: 'Deadlift', type: 'weighted' },
  { name: 'Bench Press', type: 'weighted' },
  { name: 'Overhead Press', type: 'weighted' },
  { name: 'Barbell Row', type: 'weighted' },
  { name: 'Pull-up', type: 'bodyweight' },
  { name: 'Push-up', type: 'bodyweight' },
  { name: 'Dip', type: 'bodyweight' },
  { name: 'Plank', type: 'timed' },
  { name: 'Dead Hang', type: 'timed' },
  { name: "Farmer's Carry", type: 'carry', distUnit: 'yd' },
  { name: 'Sandbag Carry', type: 'carry', distUnit: 'yd' },
  { name: 'Sled Push', type: 'distance', distUnit: 'yd' },
  { name: 'Sled Drag', type: 'distance', distUnit: 'yd' },
  { name: 'Run', type: 'cardio', distUnit: 'mi' },
  { name: 'Row', type: 'cardio', distUnit: 'mi' },
  { name: 'Bike', type: 'cardio', distUnit: 'mi' },
  { name: 'Ruck', type: 'cardio', distUnit: 'mi' },
];

/**
 * First-run seeding: adds the default exercises if the exercises table is
 * empty, and the default settings row if it is missing. Safe to call more than
 * once, even concurrently (runs in a single read-write transaction).
 */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.exercises, db.settings, async () => {
    if ((await db.exercises.count()) === 0) {
      const now = Date.now();
      const rows: Exercise[] = SEED_EXERCISES.map((e, i) => ({
        id: crypto.randomUUID(),
        name: e.name,
        type: e.type,
        ...(e.distUnit ? { distUnit: e.distUnit } : {}),
        archived: false,
        createdAt: now + i, // keeps seed order stable when sorted by createdAt
      }));
      await db.exercises.bulkAdd(rows);
    }
    if (!(await db.settings.get('settings'))) {
      await db.settings.add({ ...DEFAULT_SETTINGS });
    }
  });
}
