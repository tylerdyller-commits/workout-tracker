import { useState } from 'react';
import { formatDuration } from '../domain/format';
import { fractionLeft, remainingSec } from '../domain/timer';
import { useRestTimer } from '../hooks/restTimerContext';
import Sheet from './Sheet';
import Stepper from './Stepper';

/** Sticky bar at the bottom of the live workout while a rest is running. */
export default function RestTimerBar() {
  const { timer, now, adjust, skip, start } = useRestTimer();
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState<number | undefined>(90);

  if (!timer && !editing) return null;

  const left = timer ? remainingSec(timer, now) : 0;
  const m = Math.floor(left / 60);
  const s = left % 60;

  return (
    <>
      {timer && (
        <div
          className="rest-bar"
          role="timer"
          aria-label={`Rest timer, ${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'} left`}
        >
          <div className="rest-progress" aria-hidden="true">
            <div style={{ width: `${fractionLeft(timer, now) * 100}%` }} />
          </div>
          <div className="rest-row">
            <button
              type="button"
              className="rest-count"
              aria-label="Set a custom rest length"
              onClick={() => {
                setCustom(timer.durationSec);
                setEditing(true);
              }}
            >
              <span className="rest-label">REST · of {formatDuration(timer.durationSec)}</span>
              <span className="rest-time">{formatDuration(left)}</span>
            </button>
            <button type="button" className="rest-btn" onClick={() => adjust(-15)}>
              −15s
            </button>
            <button type="button" className="rest-btn" onClick={() => adjust(15)}>
              +15s
            </button>
            <button type="button" className="rest-btn skip" onClick={skip}>
              Skip
            </button>
          </div>
        </div>
      )}
      {editing && (
        <Sheet title="Rest length" onClose={() => setEditing(false)}>
          <Stepper
            label="Rest for"
            kind="time"
            value={custom}
            onChange={setCustom}
            step={15}
            min={5}
          />
          <p className="field-hint">Type digits like a timer: 130 = 1:30, 300 = 3:00.</p>
          <button
            type="button"
            className="primary-button full"
            disabled={!custom}
            onClick={() => {
              if (custom) start(custom);
              setEditing(false);
            }}
          >
            Start {custom ? formatDuration(custom) : ''} rest
          </button>
        </Sheet>
      )}
    </>
  );
}
