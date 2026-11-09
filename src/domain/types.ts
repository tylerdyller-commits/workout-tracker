export type ExerciseType = 'weighted' | 'bodyweight' | 'timed' | 'carry' | 'distance' | 'cardio';
export type DistUnit = 'ft' | 'yd' | 'mi';

export const EXERCISE_TYPES: readonly ExerciseType[] = [
  'weighted',
  'bodyweight',
  'timed',
  'carry',
  'distance',
  'cardio',
];

export const TYPE_LABELS: Record<ExerciseType, string> = {
  weighted: 'Weighted',
  bodyweight: 'Bodyweight',
  timed: 'Timed',
  carry: 'Carry',
  distance: 'Distance',
  cardio: 'Cardio',
};

export interface Exercise {
  id: string;
  name: string; // unique, case-insensitive
  type: ExerciseType;
  distUnit?: DistUnit; // carry/distance: 'ft'|'yd'; cardio: 'mi'
  notes?: string;
  archived: boolean; // hidden from pickers, history kept
  createdAt: number;
}

export interface PresetItem {
  id: string;
  exerciseId: string;
  targetSets: number; // default 3 (cardio default 1)
  targetReps?: number;
  targetWeightLb?: number;
  targetTimeSec?: number;
  targetDistance?: number;
  restSec?: number; // override; falls back to settings.defaultRestSec
}

export interface Preset {
  id: string;
  name: string;
  items: PresetItem[]; // ordered; lifts and cardio mixed freely
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  sample?: boolean; // created by "Load sample data"
}

export interface SetLog {
  id: string;
  weightLb?: number;
  reps?: number;
  timeSec?: number;
  distance?: number; // in the exercise's distUnit
  done: boolean;
  completedAt?: number;
}

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  presetItemId?: string;
  sets: SetLog[];
}

export interface Workout {
  id: string;
  name: string; // preset name, or "Quick workout"
  presetId?: string;
  startedAt: number;
  endedAt?: number; // undefined = in progress
  entries: WorkoutEntry[];
  notes?: string;
  sample?: boolean; // created by "Load sample data"
}

export interface Settings {
  id: 'settings';
  defaultRestSec: number; // default 90
  autoStartRest: boolean; // default true
  restSound: boolean; // default true
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  defaultRestSec: 90,
  autoStartRest: true,
  restSound: true,
};
