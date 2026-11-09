import { distUnitFor, formatDuration } from '../domain/format';
import type { Exercise, PresetItem } from '../domain/types';
import Sheet from './Sheet';
import Stepper from './Stepper';
import TypeBadge from './TypeBadge';

/** Sheet to edit one preset item's targets. Fields depend on the exercise type. */
export default function PresetItemEditor({
  item,
  exercise,
  defaultRestSec,
  onPatch,
  onRemove,
  onClose,
}: {
  item: PresetItem;
  exercise: Exercise;
  defaultRestSec: number;
  /** Applies a change to this item; an undefined value clears that field. */
  onPatch: (patch: Partial<PresetItem>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof PresetItem>(key: K, v: PresetItem[K]) =>
    onPatch({ [key]: v } as Partial<PresetItem>);
  const unit = distUnitFor(exercise);
  const t = exercise.type;

  const reps = (label = 'Reps') => (
    <Stepper
      label={label}
      value={item.targetReps}
      onChange={(v) => set('targetReps', v)}
      step={1}
      optional
    />
  );
  const weight = (label = 'Weight') => (
    <Stepper
      label={label}
      value={item.targetWeightLb}
      onChange={(v) => set('targetWeightLb', v)}
      step={5}
      unit="lb"
      allowDecimal
      optional
    />
  );
  const time = (
    <Stepper
      label="Time"
      kind="time"
      value={item.targetTimeSec}
      onChange={(v) => set('targetTimeSec', v)}
      step={5}
      optional
    />
  );
  const distance = (
    <Stepper
      label="Distance"
      value={item.targetDistance}
      onChange={(v) => set('targetDistance', v)}
      step={unit === 'mi' ? 0.05 : 5}
      decimals={unit === 'mi' ? 2 : undefined}
      unit={unit}
      allowDecimal
      optional
    />
  );

  const customRest = item.restSec != null;

  return (
    <Sheet title={exercise.name} onClose={onClose}>
      <div className="sheet-meta">
        <TypeBadge type={t} />
        <span className="muted">Targets (all optional except sets)</span>
      </div>
      <Stepper
        label="Sets"
        value={item.targetSets}
        onChange={(v) => set('targetSets', v ?? 1)}
        step={1}
        min={1}
      />
      {t === 'weighted' && (
        <>
          {reps()}
          {weight()}
        </>
      )}
      {t === 'bodyweight' && (
        <>
          {reps()}
          {weight('Added weight')}
        </>
      )}
      {t === 'timed' && (
        <>
          {time}
          {weight('Weight (optional)')}
        </>
      )}
      {t === 'carry' && (
        <>
          {distance}
          {weight()}
        </>
      )}
      {t === 'distance' && (
        <>
          {distance}
          {weight('Weight (optional)')}
        </>
      )}
      {t === 'cardio' && (
        <>
          {distance}
          {time}
        </>
      )}

      <div className="field">
        <div className="row">
          <span>Rest after each set</span>
          <button
            type="button"
            role="switch"
            aria-checked={customRest}
            aria-label="Custom rest for this exercise"
            className="switch"
            onClick={() => set('restSec', customRest ? undefined : defaultRestSec)}
          />
        </div>
        {customRest ? (
          <Stepper
            label="Rest"
            kind="time"
            value={item.restSec}
            onChange={(v) => set('restSec', v ?? 0)}
            step={15}
          />
        ) : (
          <span className="field-hint">
            Using the default ({formatDuration(defaultRestSec)}). Turn on to set a custom rest.
          </span>
        )}
      </div>

      <button type="button" className="secondary-button full" onClick={onRemove}>
        Remove from preset
      </button>
    </Sheet>
  );
}
