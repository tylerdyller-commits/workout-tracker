import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navigate, useNavigate } from 'react-router-dom';
import { db } from '../db/schema';
import {
  addExerciseToWorkout,
  addSet,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  lastSessions,
  removeSet,
  setDone,
  updateSet,
  type FinishSummary,
} from '../db/workouts';
import { formatDuration } from '../domain/format';
import { DEFAULT_SETTINGS, type Exercise, type SetLog, type WorkoutEntry } from '../domain/types';
import { useNow } from '../hooks/useNow';
import { useRestTimer } from '../hooks/restTimerContext';
import { useWakeLock } from '../hooks/useWakeLock';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseCarousel, { type ScrollRequest } from '../components/ExerciseCarousel';
import ExercisePicker from '../components/ExercisePicker';
import RestTimerBar from '../components/RestTimerBar';
import Sheet from '../components/Sheet';
import FinishSummaryView from '../components/FinishSummary';

/** Full-screen live workout: swipe between exercise cards, log sets, rest. */
export default function LiveWorkout() {
  const navigate = useNavigate();
  useWakeLock();
  const now = useNow(1000);
  const rest = useRestTimer();

  // null = no workout in progress; undefined = still loading
  const workout = useLiveQuery(async () => (await getActiveWorkout()) ?? null, []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const preset = useLiveQuery(
    async () => (workout?.presetId ? await db.presets.get(workout.presetId) : undefined),
    [workout?.presetId],
  );
  const last = useLiveQuery(() => lastSessions(workout?.id), [workout?.id]);

  const exById = useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e] as const)),
    [exercises],
  );

  const [index, setIndex] = useState(0);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState<FinishSummary | null>(null);
  // set while finishing, so the screen doesn't bounce to Home before the summary shows
  const [finishing, setFinishing] = useState(false);
  const scrollTo = (i: number, smooth = true) =>
    setScrollRequest((r) => ({ index: i, smooth, seq: (r?.seq ?? 0) + 1 }));

  if (summary) {
    return <FinishSummaryView summary={summary} onDone={() => navigate('/', { replace: true })} />;
  }
  if (workout === null && !finishing) return <Navigate to="/" replace />;
  if (!workout || !exercises) return <main className="live" />;

  const entries = workout.entries.filter((e) => exById.has(e.exerciseId));
  const total = entries.reduce((n, e) => n + e.sets.length, 0);
  const done = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const current = Math.min(index, Math.max(0, entries.length - 1));
  const currentEx = entries[current] && exById.get(entries[current].exerciseId);
  const defaultRest = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;
  const autoStart = settings?.autoStartRest ?? DEFAULT_SETTINGS.autoStartRest;

  const restFor = (entry?: WorkoutEntry) => {
    const item = preset?.items.find((i) => i.id === entry?.presetItemId);
    return item?.restSec ?? defaultRest;
  };

  const toggleDone = async (entry: WorkoutEntry, entryIndex: number, set: SetLog) => {
    const nowDone = !set.done;
    await setDone(workout.id, entry.id, set.id, nowDone);
    if (!nowDone) return;
    if (autoStart) rest.start(restFor(entry));
    // last set of this exercise done → move on to the next card
    const allDone = entry.sets.every((s) => s.id === set.id || s.done);
    if (allDone && entryIndex < entries.length - 1) {
      window.setTimeout(() => scrollTo(entryIndex + 1), 450);
    }
  };

  const addExercise = async (ex: Exercise) => {
    setPicking(false);
    await addExerciseToWorkout(workout.id, ex);
    // the new card renders after the live query updates; then scroll to it
    window.setTimeout(() => scrollTo(entries.length), 150);
  };

  const finish = async () => {
    const pending = total - done;
    const msg =
      pending > 0
        ? `Finish workout? ${pending} set${pending === 1 ? '' : 's'} not marked done will be discarded.`
        : 'Finish workout?';
    if (!window.confirm(msg)) return;
    setFinishing(true);
    const s = await finishWorkout(workout.id);
    rest.skip();
    if (s) setSummary(s);
    else navigate('/', { replace: true });
  };

  const discard = async () => {
    if (!window.confirm('Discard this workout? Everything logged in it will be deleted.')) return;
    await discardWorkout(workout.id);
    rest.skip();
    navigate('/', { replace: true });
  };

  return (
    <main className="live">
      <header className="live-top">
        <div className="live-title">
          <span className="live-name">{workout.name}</span>
          <span className="live-sub">
            Elapsed {formatDuration((now - workout.startedAt) / 1000)} · {done} of {total} sets
          </span>
        </div>
        <button
          type="button"
          className="live-btn"
          onClick={() => rest.start(restFor(entries[current]))}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5M9 2h6" />
          </svg>
          Rest
        </button>
        <button type="button" className="live-btn primary" onClick={() => void finish()}>
          Finish
        </button>
        <button
          type="button"
          className="live-btn icon"
          aria-label="More: discard workout"
          onClick={() => setMenuOpen(true)}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </header>

      {entries.length > 0 && (
        <div className="live-pos">
          <button
            type="button"
            className="live-pos-label"
            onClick={() => setJumpOpen(true)}
            aria-label={`Exercise ${current + 1} of ${entries.length}, ${currentEx?.name}. Tap to jump to another exercise.`}
          >
            Exercise {current + 1} of {entries.length} · {currentEx?.name} ▾
          </button>
          <div className="dots" aria-hidden="true">
            {entries.map((e, i) => (
              <span key={e.id} className={i === current ? 'dot active' : 'dot'} />
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="live-empty">
          <p className="muted">Add your first exercise to get going.</p>
          <button type="button" className="dashed-button accent" onClick={() => setPicking(true)}>
            + Add exercise
          </button>
        </div>
      ) : (
        <ExerciseCarousel
          count={entries.length}
          // open on the first exercise that still has sets to do
          initialIndex={Math.max(
            0,
            entries.findIndex((e) => e.sets.some((x) => !x.done)),
          )}
          onIndexChange={setIndex}
          scrollRequest={scrollRequest}
        >
          {entries.map((entry, i) => {
            const ex = exById.get(entry.exerciseId)!;
            const next = entries[i + 1] && exById.get(entries[i + 1].exerciseId);
            return (
              <ExerciseCard
                key={entry.id}
                entry={entry}
                exercise={ex}
                last={last?.get(ex.id)}
                nextName={next?.name}
                isLast={i === entries.length - 1}
                onChangeSet={(set, values) => void updateSet(workout.id, entry.id, set.id, values)}
                onToggleDone={(set) => void toggleDone(entry, i, set)}
                onAddSet={() => void addSet(workout.id, entry.id)}
                onRemoveSet={(set) => void removeSet(workout.id, entry.id, set.id)}
                onAddExercise={() => setPicking(true)}
              />
            );
          })}
        </ExerciseCarousel>
      )}

      <RestTimerBar />

      {jumpOpen && (
        <Sheet title="Jump to exercise" onClose={() => setJumpOpen(false)}>
          <ul className="list">
            {entries.map((e, i) => {
              const ex = exById.get(e.exerciseId);
              const d = e.sets.filter((s) => s.done).length;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="list-row"
                    aria-current={i === current}
                    onClick={() => {
                      setJumpOpen(false);
                      scrollTo(i);
                    }}
                  >
                    <span className="list-row-title">
                      {i + 1}. {ex?.name}
                    </span>
                    <span
                      className={d === e.sets.length && d > 0 ? 'jump-count done' : 'jump-count'}
                    >
                      {d}/{e.sets.length} sets
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}

      {menuOpen && (
        <Sheet title="Workout" onClose={() => setMenuOpen(false)}>
          <button type="button" className="secondary-button full" onClick={() => void discard()}>
            Discard workout
          </button>
        </Sheet>
      )}

      {picking && (
        <ExercisePicker onPick={(ex) => void addExercise(ex)} onClose={() => setPicking(false)} />
      )}
    </main>
  );
}
