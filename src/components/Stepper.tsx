import { useId, useState } from 'react';
import { formatDuration, formatNumber, parseDuration } from '../domain/format';

export interface StepperProps {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step: number;
  /** Lowest allowed value (default 0). */
  min?: number;
  /** Optional values can be cleared: stepping below `min` (or to 0) empties them. */
  optional?: boolean;
  /** 'time' shows m:ss and accepts typed times; 'number' shows the number. */
  kind?: 'number' | 'time';
  /** Fixed decimals to display (e.g. 2 for miles). */
  decimals?: number;
  unit?: string;
  /** Allow typing decimals (weight, miles). */
  allowDecimal?: boolean;
  /** Compact layout for set rows: no label above; a small caption under the value. */
  compact?: boolean;
  /** Caption under the value in compact mode (defaults to unit, then label). */
  caption?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Big − / + buttons around a value. Tapping the value opens the number pad to
 * type it directly.
 */
export default function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  optional = false,
  kind = 'number',
  decimals,
  unit,
  allowDecimal = false,
  compact = false,
  caption,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const id = useId();

  const display =
    value == null
      ? '—'
      : kind === 'time'
        ? formatDuration(value)
        : decimals != null
          ? value.toFixed(decimals)
          : formatNumber(value);

  const dec = () => {
    if (value == null) return;
    const next = round2(value - step);
    if (optional && (next < min || next <= 0)) onChange(undefined);
    else onChange(Math.max(min, next));
  };
  const inc = () => onChange(value == null ? Math.max(min, step) : round2(value + step));

  const commit = () => {
    setEditing(false);
    const t = text.trim();
    if (!t) return; // nothing typed: keep the old value
    const parsed =
      kind === 'time' ? parseDuration(t) : /^\d*\.?\d+$/.test(t) ? Number(t) : undefined;
    if (parsed == null || Number.isNaN(parsed)) return;
    const v = allowDecimal || kind === 'time' ? round2(parsed) : Math.round(parsed);
    if (optional && v <= 0) onChange(undefined);
    else onChange(Math.max(min, v));
  };

  return (
    <div className={compact ? 'stepper compact' : 'stepper'}>
      {!compact && (
        <label className="stepper-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="stepper-row">
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Decrease ${label}`}
          onClick={dec}
          disabled={value == null || (!optional && value <= min)}
        >
          −
        </button>
        {editing ? (
          <input
            id={id}
            className="stepper-input"
            autoFocus
            type="text"
            inputMode={kind === 'time' ? 'numeric' : allowDecimal ? 'decimal' : 'numeric'}
            enterKeyHint="done"
            placeholder={kind === 'time' ? 'mmss' : display}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setText('');
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            id={id}
            type="button"
            className="stepper-value"
            aria-label={`${label}: ${display}${unit && value != null ? ` ${unit}` : ''}. Tap to type.`}
            onClick={() => {
              setText('');
              setEditing(true);
            }}
          >
            {compact ? (
              <>
                <span className="stepper-num">{display}</span>
                <span className="stepper-caption">{caption ?? unit ?? label}</span>
              </>
            ) : (
              <>
                {display}
                {unit && value != null && <span className="stepper-unit"> {unit}</span>}
              </>
            )}
          </button>
        )}
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Increase ${label}`}
          onClick={inc}
        >
          +
        </button>
      </div>
    </div>
  );
}
