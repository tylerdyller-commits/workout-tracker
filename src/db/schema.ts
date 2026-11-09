import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, Preset, Settings, Workout } from '../domain/types';

export class WorkoutDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  presets!: EntityTable<Preset, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('workout-tracker');
    // Version 1. Any future schema change must add a new this.version(n) block
    // with a migration that keeps existing data.
    // Note: IndexedDB cannot index booleans, so the `archived` index never
    // matches anything; filter it in JS instead (e.g. .filter(e => !e.archived)).
    this.version(1).stores({
      exercises: 'id, name, type, archived',
      presets: 'id, name, lastUsedAt',
      workouts: 'id, startedAt, endedAt, presetId',
      settings: 'id',
    });
  }
}

export const db = new WorkoutDB();
