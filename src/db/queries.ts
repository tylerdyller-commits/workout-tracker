import { db } from './schema';
import { defaultTargetSets } from '../domain/format';
import type { DistUnit, Exercise, ExerciseType, Preset, PresetItem } from '../domain/types';

// ---------- Exercises ----------

export class DuplicateNameError extends Error {
  constructor(name: string) {
    super(`An exercise called "${name}" already exists.`);
    this.name = 'DuplicateNameError';
  }
}

/** Case-insensitive, whitespace-trimmed name comparison key. */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Creates an exercise. Names are unique (case-insensitive, including archived
 * exercises). Carry/distance default to yards; cardio always uses miles.
 */
export async function createExercise(input: {
  name: string;
  type: ExerciseType;
  distUnit?: DistUnit;
}): Promise<Exercise> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Please enter a name.');
  return db.transaction('rw', db.exercises, async () => {
    const all = await db.exercises.toArray();
    const existing = all.find((e) => nameKey(e.name) === nameKey(name));
    if (existing) throw new DuplicateNameError(existing.name);
    const ex: Exercise = {
      id: crypto.randomUUID(),
      name,
      type: input.type,
      archived: false,
      createdAt: Date.now(),
    };
    if (input.type === 'cardio') ex.distUnit = 'mi';
    else if (input.type === 'carry' || input.type === 'distance') {
      ex.distUnit = input.distUnit === 'ft' ? 'ft' : 'yd';
    }
    await db.exercises.add(ex);
    return ex;
  });
}

// ---------- Presets ----------

export function newPresetItem(ex: Pick<Exercise, 'id' | 'type'>): PresetItem {
  return { id: crypto.randomUUID(), exerciseId: ex.id, targetSets: defaultTargetSets(ex.type) };
}

export async function createPreset(name = 'New preset'): Promise<Preset> {
  const now = Date.now();
  const preset: Preset = {
    id: crypto.randomUUID(),
    name,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.presets.add(preset);
  return preset;
}

/** Saves the given fields and bumps updatedAt. */
export async function updatePreset(
  id: string,
  changes: Partial<Pick<Preset, 'name' | 'items'>>,
): Promise<void> {
  await db.presets.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deletePreset(id: string): Promise<void> {
  await db.presets.delete(id);
}

/** Copies a preset (new ids for it and its items). Usage history is not copied. */
export async function duplicatePreset(id: string): Promise<Preset> {
  const src = await db.presets.get(id);
  if (!src) throw new Error('Preset not found');
  const now = Date.now();
  const copy: Preset = {
    id: crypto.randomUUID(),
    name: `${src.name} (copy)`,
    items: src.items.map((it) => ({ ...it, id: crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  };
  await db.presets.add(copy);
  return copy;
}

/** Most recently used first; never-used presets after, newest edit first. */
export function sortPresetsForHome(presets: Preset[]): Preset[] {
  return [...presets].sort(
    (a, b) => (b.lastUsedAt ?? -1) - (a.lastUsedAt ?? -1) || b.updatedAt - a.updatedAt,
  );
}

/** Moves the element at `index` by `delta` (-1 up, +1 down). Out of range = unchanged. */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}
