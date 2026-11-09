import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import {
  DuplicateNameError,
  createExercise,
  createPreset,
  duplicatePreset,
  moveItem,
  newPresetItem,
  sortPresetsForHome,
  updatePreset,
} from './queries';
import type { Preset } from '../domain/types';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('createExercise', () => {
  it('sets the right distance unit per type', async () => {
    expect((await createExercise({ name: 'Yoke', type: 'carry' })).distUnit).toBe('yd');
    expect(
      (await createExercise({ name: 'Prowler', type: 'distance', distUnit: 'ft' })).distUnit,
    ).toBe('ft');
    expect((await createExercise({ name: 'Swim', type: 'cardio', distUnit: 'yd' })).distUnit).toBe(
      'mi',
    );
    expect((await createExercise({ name: 'Curl', type: 'weighted' })).distUnit).toBeUndefined();
  });

  it('rejects duplicate names case-insensitively and trims whitespace', async () => {
    const ex = await createExercise({ name: '  Front   Squat ', type: 'weighted' });
    expect(ex.name).toBe('Front Squat');
    await expect(createExercise({ name: 'front squat', type: 'weighted' })).rejects.toBeInstanceOf(
      DuplicateNameError,
    );
    await expect(createExercise({ name: '   ', type: 'weighted' })).rejects.toThrow();
  });
});

describe('presets', () => {
  it('new items default to 3 sets, cardio to 1', () => {
    expect(newPresetItem({ id: 'a', type: 'weighted' }).targetSets).toBe(3);
    expect(newPresetItem({ id: 'b', type: 'cardio' }).targetSets).toBe(1);
  });

  it('duplicates with new ids and without usage history', async () => {
    const p = await createPreset('Lower');
    const items = [
      { ...newPresetItem({ id: 'sq', type: 'weighted' }), targetReps: 5, targetWeightLb: 225 },
      newPresetItem({ id: 'run', type: 'cardio' }),
    ];
    await updatePreset(p.id, { items });
    await db.presets.update(p.id, { lastUsedAt: 123 });

    const copy = await duplicatePreset(p.id);
    expect(copy.id).not.toBe(p.id);
    expect(copy.name).toBe('Lower (copy)');
    expect(copy.lastUsedAt).toBeUndefined();
    expect(copy.items.map((i) => i.exerciseId)).toEqual(['sq', 'run']);
    expect(copy.items[0]).toMatchObject({ targetReps: 5, targetWeightLb: 225 });
    expect(copy.items.map((i) => i.id)).not.toContain(items[0].id);
    expect(await db.presets.count()).toBe(2);
  });

  it('sorts by last used, then never-used by latest edit', () => {
    const p = (id: string, updatedAt: number, lastUsedAt?: number) =>
      ({ id, name: id, items: [], createdAt: 0, updatedAt, lastUsedAt }) as Preset;
    const sorted = sortPresetsForHome([p('a', 5), p('b', 1, 100), p('c', 9), p('d', 1, 200)]);
    expect(sorted.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('moveItem reorders and ignores out-of-range moves', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});
