import type { FinishSummary } from '../db/workouts';
import { distUnitFor, formatDistance, formatDuration, formatNumber } from '../domain/format';
import type { Exercise } from '../domain/types';

function maxLabel(ex: Exercise, value: number): string {
  switch (ex.type) {
    case 'weighted':
    case 'carry':
      return `${formatNumber(value)} lb`;
    case 'bodyweight':
      return `${value} reps`;
    case 'timed':
      return formatDuration(value);
    case 'distance':
    case 'cardio':
      return formatDistance(value, distUnitFor(ex));
  }
}

/** Shown after Finish: duration, sets done and any new maxes. */
export default function FinishSummaryView({
  summary,
  onDone,
}: {
  summary: FinishSummary;
  onDone: () => void;
}) {
  return (
    <main className="screen summary">
      <h1>{summary.saved ? 'Workout done' : 'Nothing saved'}</h1>
      {summary.saved ? (
        <>
          <p className="muted">{summary.name}</p>
          <div className="stat-grid">
            <div className="card stat">
              <span className="muted small">Duration</span>
              <span className="stat-value">{formatDuration(summary.durationSec)}</span>
            </div>
            <div className="card stat">
              <span className="muted small">Sets done</span>
              <span className="stat-value">
                {summary.setsDone}{' '}
                <span className="stat-unit">
                  in {summary.exercises} {summary.exercises === 1 ? 'exercise' : 'exercises'}
                </span>
              </span>
            </div>
          </div>
          {summary.newMaxes.length > 0 && (
            <section className="stack">
              <h2 className="section-title">New maxes</h2>
              {summary.newMaxes.map((m) => (
                <div key={m.exercise.id} className="card row">
                  <span>{m.exercise.name}</span>
                  <span className="positive">▲ {maxLabel(m.exercise, m.value)}</span>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <p className="muted">No sets were marked done, so this workout wasn’t saved.</p>
      )}
      <button type="button" className="primary-button full" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
