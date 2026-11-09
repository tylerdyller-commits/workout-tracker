import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { adjustTimer, isFinished, parseTimer, startTimer, type RestTimer } from '../domain/timer';
import { beep, unlockAudio } from '../lib/sound';
import { RestTimerContext, type RestTimerApi } from '../hooks/restTimerContext';

const STORAGE_KEY = 'workout-tracker.rest-timer';
/** If the rest ended longer ago than this (e.g. app was closed), don't alert. */
const LATE_ALERT_MS = 15_000;

function save(t: RestTimer | null) {
  try {
    if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore (private mode, storage full)
  }
}

/**
 * Owns the rest timer for the whole app, so it keeps running (and alerts)
 * whichever screen is open. State lives in memory and localStorage, so it
 * survives a reload. Time left is always computed from the end timestamp.
 */
export default function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimerState] = useState<RestTimer | null>(() => {
    try {
      return parseTimer(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState(false);
  const timerRef = useRef(timer);
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const soundRef = useRef(true);
  useEffect(() => {
    soundRef.current = settings?.restSound ?? true;
  }, [settings]);

  const setTimer = useCallback((t: RestTimer | null) => {
    timerRef.current = t;
    save(t);
    setTimerState(t);
  }, []);

  // Unlock Web Audio on the first tap anywhere (iOS requirement).
  useEffect(() => {
    const onTap = () => unlockAudio();
    window.addEventListener('pointerdown', onTap, { once: true, capture: true });
    return () => window.removeEventListener('pointerdown', onTap, { capture: true });
  }, []);

  // Tick only while a rest is running.
  useEffect(() => {
    if (!timer) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const t = timerRef.current;
      if (t && isFinished(t, n)) {
        setTimer(null);
        if (n - t.endsAt < LATE_ALERT_MS) {
          setFlash(true);
          if (soundRef.current) beep();
          window.setTimeout(() => setFlash(false), 2200);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [timer, setTimer]);

  const api = useMemo<RestTimerApi>(
    () => ({
      timer,
      now,
      start: (sec) => {
        const n = Date.now();
        setNow(n);
        setTimer(startTimer(sec, n));
      },
      adjust: (delta) => {
        const t = timerRef.current;
        if (!t) return;
        const n = Date.now();
        setNow(n);
        setTimer(adjustTimer(t, delta, n));
      },
      skip: () => setTimer(null),
    }),
    [timer, now, setTimer],
  );

  return (
    <RestTimerContext.Provider value={api}>
      {children}
      {flash && (
        <div className="rest-flash" role="alert" onClick={() => setFlash(false)}>
          <span>Rest over</span>
        </div>
      )}
    </RestTimerContext.Provider>
  );
}
