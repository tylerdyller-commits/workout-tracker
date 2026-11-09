import { useState } from 'react';
import { formatShortDate, lastTimeLine } from '../domain/format';
import type { SetValues } from '../domain/prefill';
import type { Exercise, SetLog, WorkoutEntry } from '../domain/types';
import type { LastSession } from '../db/workouts';
import SetRow from './SetRow';
import TypeBadge from './TypeBadge';

/** One exercise in the live workout: name, last time, set rows and + Add set. */
export default function ExerciseCard({
  entry,
  exercise,
  last,
  nextName,
  isLast,
  onChangeSet,
  onToggleDone,
  onAddSet,
  onRemoveSet,
  onAddExercise,
}: {
  entry: WorkoutEntry;
  exercise: Exercise;
  last?: LastSession;
  nextName?: string;
  isLast: boolean;
  onChangeSet: (set: SetLog, values: Partial<SetValues>) => void;
  onToggleDone: (set: SetLog) => void;
  onAddSet: () => void;
  onRemoveSet: (set: SetLog) => void;
  onAddExercise: () => void;
}) {
  // Which set is open for editing: the one you tapped, else the first not done.
  const [selected, setSelected] = useState<string | null>(null);
  const firstPending = entry.sets.find((s) => !s.done)?.id ?? null;
  const expandedId =
    selected && entry.sets.some((s) => s.id === selected) ? selected : firstPending;

  return (
    <section className="ex-card" aria-label={exercise.name}>
      <div className="ex-card-head">
        <h2>{exercise.name}</h2>
        <TypeBadge type={exercise.type} />
      </div>
      <span className="ex-last">
        {last
          ? `Last time (${formatShortDate(last.date)}): ${lastTimeLine(last.sets, exercise)}`
          : 'First time logging this exercise'}
      </span>

      {entry.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i}
          set={set}
          exercise={exercise}
          expanded={set.id === expandedId}
          lastTime={last?.sets[i]}
          onExpand={() => setSelected(set.id)}
          onChange={(values) => onChangeSet(set, values)}
          onToggleDone={() => {
            // after completing, move on to the next set that isn't done
            if (!set.done) setSelected(null);
            onToggleDone(set);
          }}
          onRemove={() => {
            if (window.confirm(`Remove set ${i + 1}?`)) onRemoveSet(set);
          }}
        />
      ))}

      <button type="button" className="add-set" onClick={onAddSet}>
        + Add set
      </button>

      {isLast ? (
        <button type="button" className="dashed-button accent ex-add" onClick={onAddExercise}>
          + Add exercise
        </button>
      ) : (
        nextName && <span className="ex-next">Swipe for {nextName} →</span>
      )}
    </section>
  );
}
