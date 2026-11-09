import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { createExercise, nameKey } from '../db/queries';
import { EXERCISE_TYPES, TYPE_LABELS, type Exercise, type ExerciseType } from '../domain/types';
import Sheet from './Sheet';
import TypeBadge from './TypeBadge';

/** Full-height sheet to search, filter and pick an exercise, or create a new one. */
export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExerciseType | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const q = nameKey(query);
    return (exercises ?? [])
      .filter((e) => !e.archived)
      .filter((e) => filter === 'all' || e.type === filter)
      .filter((e) => !q || nameKey(e.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter]);

  return (
    <Sheet title={creating ? 'New exercise' : 'Add exercise'} onClose={onClose} full>
      {creating ? (
        <NewExerciseForm
          initialName={query}
          initialType={filter === 'all' ? 'weighted' : filter}
          onCancel={() => setCreating(false)}
          onCreated={onPick}
        />
      ) : (
        <>
          <input
            className="text-input"
            type="search"
            placeholder="Search exercises"
            aria-label="Search exercises"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips" role="group" aria-label="Filter by type">
            {(['all', ...EXERCISE_TYPES] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'All' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <button type="button" className="dashed-button" onClick={() => setCreating(true)}>
            + New exercise
          </button>
          <ul className="list">
            {visible.map((ex) => (
              <li key={ex.id}>
                <button type="button" className="list-row" onClick={() => onPick(ex)}>
                  <span className="list-row-title">{ex.name}</span>
                  <TypeBadge type={ex.type} />
                </button>
              </li>
            ))}
            {exercises && visible.length === 0 && (
              <li className="muted empty-note">No exercises match. Try “+ New exercise”.</li>
            )}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function NewExerciseForm({
  initialName,
  initialType,
  onCancel,
  onCreated,
}: {
  initialName: string;
  initialType: ExerciseType;
  onCancel: () => void;
  onCreated: (ex: Exercise) => void;
}) {
  const [name, setName] = useState(initialName.trim());
  const [type, setType] = useState<ExerciseType>(initialType);
  const [distUnit, setDistUnit] = useState<'ft' | 'yd'>('yd');
  const [error, setError] = useState('');
  const needsUnit = type === 'carry' || type === 'distance';

  const submit = async () => {
    try {
      const ex = await createExercise({ name, type, distUnit: needsUnit ? distUnit : undefined });
      onCreated(ex);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the exercise.');
    }
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="text-input"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="e.g. Front Squat"
        />
      </label>
      <div className="field">
        <span className="field-label">Type</span>
        <div className="chips wrap" role="radiogroup" aria-label="Type">
          {EXERCISE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className="chip"
              onClick={() => setType(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <span className="field-hint">{TYPE_HINTS[type]}</span>
      </div>
      {needsUnit && (
        <div className="field">
          <span className="field-label">Distance unit</span>
          <div className="chips" role="radiogroup" aria-label="Distance unit">
            {(['yd', 'ft'] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={distUnit === u}
                className="chip"
                onClick={() => setDistUnit(u)}
              >
                {u === 'yd' ? 'Yards (yd)' : 'Feet (ft)'}
              </button>
            ))}
          </div>
        </div>
      )}
      {type === 'cardio' && <span className="field-hint">Cardio distance is in miles.</span>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Back
        </button>
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Create
        </button>
      </div>
    </form>
  );
}

const TYPE_HINTS: Record<ExerciseType, string> = {
  weighted: 'Logs weight and reps.',
  bodyweight: 'Logs reps, with optional added weight.',
  timed: 'Logs time, with optional weight.',
  carry: 'Logs weight and distance.',
  distance: 'Logs distance, with optional weight (e.g. sled).',
  cardio: 'Logs time and distance in miles, and shows pace.',
};
