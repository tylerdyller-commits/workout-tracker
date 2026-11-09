import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { SEED_EXERCISES, seedIfEmpty } from './seed';

describe('seedIfEmpty', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('seeds the 18 default exercises and default settings', async () => {
    await seedIfEmpty();
    const exercises = await db.exercises.toArray();
    expect(exercises).toHaveLength(18);
    expect(exercises).toHaveLength(SEED_EXERCISES.length);
    expect(exercises.every((e) => !e.archived)).toBe(true);
    expect(exercises.find((e) => e.name === 'Run')).toMatchObject({
      type: 'cardio',
      distUnit: 'mi',
    });
    expect(exercises.find((e) => e.name === "Farmer's Carry")).toMatchObject({
      type: 'carry',
      distUnit: 'yd',
    });
    expect(exercises.find((e) => e.name === 'Back Squat')?.distUnit).toBeUndefined();
    expect(await db.settings.get('settings')).toEqual({
      id: 'settings',
      defaultRestSec: 90,
      autoStartRest: true,
      restSound: true,
    });
  });

  it('does not duplicate when called twice, even concurrently', async () => {
    await Promise.all([seedIfEmpty(), seedIfEmpty()]);
    await seedIfEmpty();
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length);
    expect(await db.settings.count()).toBe(1);
  });

  it('does not re-seed exercises if some already exist', async () => {
    await db.exercises.add({
      id: 'x',
      name: 'Custom',
      type: 'weighted',
      archived: false,
      createdAt: 1,
    });
    await seedIfEmpty();
    expect(await db.exercises.count()).toBe(1);
  });
});
