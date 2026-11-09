import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/schema';
import { sortPresetsForHome } from '../db/queries';
import { getActiveWorkout, startWorkout } from '../db/workouts';
import { formatDayDate, formatDuration, presetMeta } from '../domain/format';
import { useNow } from '../hooks/useNow';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function Home() {
  const navigate = useNavigate();
  const presets = useLiveQuery(() => db.presets.toArray(), []);
  const stats = useLiveQuery(async () => {
    const weekAgo = Date.now() - WEEK_MS;
    const finished = await db.workouts.where('endedAt').above(0).reverse().sortBy('endedAt');
    return {
      weekCount: finished.filter((w) => (w.endedAt ?? 0) >= weekAgo).length,
      last: finished[0],
    };
  }, []);

  const sorted = sortPresetsForHome(presets ?? []);
  const weekCount = stats?.weekCount ?? 0;
  const last = stats?.last;

  const active = useLiveQuery(() => getActiveWorkout(), []);
  const now = useNow(1000);

  const start = async (presetId?: string) => {
    if (active) {
      if (window.confirm('A workout is already in progress. Resume it?')) navigate('/workout');
      return;
    }
    await startWorkout(presetId);
    navigate('/workout');
  };

  return (
    <main className="screen">
      <header className="screen-header">
        <div className="titles">
          <span className="eyebrow">{todayLabel()}</span>
          <h1>Workouts</h1>
        </div>
        <Link to="/settings" className="icon-button" aria-label="Settings">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </header>

      {active && (
        <Link to="/workout" className="resume-banner">
          <span className="resume-text">
            <span className="resume-eyebrow">
              In progress · {formatDuration((now - active.startedAt) / 1000)}
            </span>
            <span className="resume-name">{active.name}</span>
          </span>
          <span className="resume-btn">Resume</span>
        </Link>
      )}

      <section className="stack">
        <h2 className="section-title">Start a preset</h2>
        {sorted.map((p) => (
          <button key={p.id} type="button" className="card-link" onClick={() => void start(p.id)}>
            <div className="card-text">
              <span className="card-title">{p.name}</span>
              <span className="card-sub">{presetMeta(p)}</span>
            </div>
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ))}
        {presets && presets.length === 0 && (
          <p className="placeholder">
            No presets yet. <Link to="/presets/new">Create your first preset</Link>.
          </p>
        )}
        <button type="button" className="dashed-button" onClick={() => void start()}>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Quick workout
        </button>
      </section>

      <section className="stat-grid">
        <div className="card stat">
          <span className="muted small">Last 7 days</span>
          <span className="stat-value">
            {weekCount}{' '}
            <span className="stat-unit">{weekCount === 1 ? 'workout' : 'workouts'}</span>
          </span>
        </div>
        <div className="card stat">
          <span className="muted small">Last workout</span>
          {last ? (
            <>
              <span className="stat-name">{last.name}</span>
              <span className="muted small">
                {formatDayDate(last.startedAt)} ·{' '}
                {Math.max(
                  1,
                  Math.round(((last.endedAt ?? last.startedAt) - last.startedAt) / 60000),
                )}{' '}
                min
              </span>
            </>
          ) : (
            <span className="muted">None yet</span>
          )}
        </div>
      </section>
    </main>
  );
}
