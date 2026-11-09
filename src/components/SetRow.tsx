import { distUnitFor, formatPace, setShort, setSummary } from '../domain/format';
import type { SetValues } from '../domain/prefill';
import type { Exercise, SetLog } from '../domain/types';
import { useLongPress } from '../hooks/useLongPress';
import Stepper from './Stepper';

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** The inputs for one set, by exercise type. */
function SetInputs({
  set,
  exercise,
  onChange,
}: {
  set: SetLog;
  exercise: Exercise;
  onChange: (values: Partial<SetValues>) => void;
}) {
  const unit = distUnitFor(exercise);
  const weight = (optional: boolean, caption = 'lb') => (
    <Stepper
      compact
      label="Weight"
      caption={caption}
      value={set.weightLb}
      onChange={(v) => onChange({ weightLb: v })}
      step={5}
      allowDecimal
      optional={optional}
    />
  );
  const reps = (
    <Stepper
      compact
      label="Reps"
      caption="reps"
      value={set.reps}
      onChange={(v) => onChange({ reps: v })}
      step={1}
    />
  );
  const time = (
    <Stepper
      compact
      label="Time"
      caption="time"
      kind="time"
      value={set.timeSec}
      onChange={(v) => onChange({ timeSec: v })}
      step={5}
    />
  );
  const distance = (
    <Stepper
      compact
      label="Distance"
      caption={unit}
      value={set.distance}
      onChange={(v) => onChange({ distance: v })}
      step={unit === 'mi' ? 0.05 : 5}
      decimals={unit === 'mi' ? 2 : undefined}
      allowDecimal
    />
  );

  switch (exercise.type) {
    case 'weighted':
      return (
        <>
          {weight(false)}
          {reps}
        </>
      );
    case 'bodyweight':
      return (
        <>
          {reps}
          {weight(true, '+ lb (optional)')}
        </>
      );
    case 'timed':
      return (
        <>
          {time}
          {weight(true, 'lb (optional)')}
        </>
      );
    case 'carry':
      return (
        <>
          {weight(false)}
          {distance}
        </>
      );
    case 'distance':
      return (
        <>
          {distance}
          {weight(true, 'lb (optional)')}
        </>
      );
    case 'cardio':
      return (
        <>
          {time}
          {distance}
        </>
      );
  }
}

/**
 * One set. Expanded (the active set) shows big steppers; collapsed shows a
 * one-line summary. The ✓ marks it done (tap again to undo). Long-press a
 * collapsed row to remove it.
 */
export default function SetRow({
  index,
  set,
  exercise,
  expanded,
  lastTime,
  onExpand,
  onChange,
  onToggleDone,
  onRemove,
}: {
  index: number;
  set: SetLog;
  exercise: Exercise;
  expanded: boolean;
  lastTime?: SetLog;
  onExpand: () => void;
  onChange: (values: Partial<SetValues>) => void;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const press = useLongPress(onRemove, onExpand);

  if (expanded) {
    const pace = exercise.type === 'cardio' ? formatPace(set.timeSec, set.distance) : undefined;
    return (
      <div className={set.done ? 'set-active done' : 'set-active'}>
        <div className="set-active-head">
          <span className="set-active-label">
            SET {n}
            {lastTime ? ` · last time ${setShort(lastTime, exercise)}` : ''}
          </span>
          <button type="button" className="set-remove" onClick={onRemove}>
            Remove
          </button>
        </div>
        <div className="set-active-body">
          <div className="set-inputs">
            <SetInputs set={set} exercise={exercise} onChange={onChange} />
            {exercise.type === 'cardio' && (
              <span className="pace">
                Pace <strong>{pace ?? '—'}</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            className={set.done ? 'check-btn done' : 'check-btn primary'}
            aria-label={set.done ? `Set ${n} done. Tap to undo.` : `Complete set ${n}`}
            aria-pressed={set.done}
            onClick={onToggleDone}
          >
            <CheckIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={set.done ? 'set-row done' : 'set-row'}>
      <button
        type="button"
        className="set-row-main"
        aria-label={`Set ${n}: ${setSummary(set, exercise)}. Tap to edit, hold to remove.`}
        {...press}
      >
        <span className="set-num">{n}</span>
        <span className="set-summary">{setSummary(set, exercise)}</span>
      </button>
      <button
        type="button"
        className={set.done ? 'check-btn done' : 'check-btn'}
        aria-label={set.done ? `Set ${n} done. Tap to undo.` : `Complete set ${n}`}
        aria-pressed={set.done}
        onClick={onToggleDone}
      >
        <CheckIcon />
      </button>
    </div>
  );
}
