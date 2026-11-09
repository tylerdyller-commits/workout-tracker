import { describe, expect, it } from 'vitest';
import {
  adjustTimer,
  fractionLeft,
  isFinished,
  parseTimer,
  remainingSec,
  startTimer,
} from './timer';
import { prefillSet } from './prefill';
import { metricValue, sessionMax } from './metrics';
import { formatPace, lastTimeLine, setShort, setSummary } from './format';
import type { PresetItem, SetLog } from './types';

const T0 = 1_700_000_000_000;

describe('rest timer math', () => {
  it('counts down from the end timestamp, not from ticks', () => {
    const t = startTimer(90, T0);
    expect(remainingSec(t, T0)).toBe(90);
    expect(remainingSec(t, T0 + 500)).toBe(90); // rounds up
    expect(remainingSec(t, T0 + 1000)).toBe(89);
    // phone locked for 60 s: no ticks happened, time is still right
    expect(remainingSec(t, T0 + 60_000)).toBe(30);
    expect(remainingSec(t, T0 + 89_001)).toBe(1);
    expect(remainingSec(t, T0 + 90_000)).toBe(0);
    expect(remainingSec(t, T0 + 200_000)).toBe(0); // never negative
  });

  it('knows when it is finished and how much is left', () => {
    const t = startTimer(60, T0);
    expect(isFinished(t, T0 + 59_999)).toBe(false);
    expect(isFinished(t, T0 + 60_000)).toBe(true);
    expect(fractionLeft(t, T0)).toBe(1);
    expect(fractionLeft(t, T0 + 30_000)).toBe(0.5);
    expect(fractionLeft(t, T0 + 99_000)).toBe(0);
  });

  it('adds and removes 15 s, never below zero', () => {
    const t = startTimer(90, T0);
    const plus = adjustTimer(t, 15, T0 + 10_000);
    expect(remainingSec(plus, T0 + 10_000)).toBe(95);
    expect(plus.durationSec).toBe(105);
    const minus = adjustTimer(t, -15, T0 + 10_000);
    expect(remainingSec(minus, T0 + 10_000)).toBe(65);
    const tooMuch = adjustTimer(startTimer(10, T0), -15, T0);
    expect(remainingSec(tooMuch, T0)).toBe(0);
    expect(tooMuch.durationSec).toBeGreaterThan(0);
  });

  it('round-trips through storage and rejects junk', () => {
    const t = startTimer(90, T0);
    expect(parseTimer(JSON.stringify(t))).toEqual(t);
    expect(parseTimer(null)).toBeNull();
    expect(parseTimer('not json')).toBeNull();
    expect(parseTimer('{"endsAt":"x","durationSec":5}')).toBeNull();
    expect(parseTimer('{"endsAt":5,"durationSec":0}')).toBeNull();
  });
});

const set = (v: Partial<SetLog>): SetLog => ({ id: 'x', done: true, ...v });
const target: PresetItem = {
  id: 'p',
  exerciseId: 'e',
  targetSets: 3,
  targetReps: 5,
  targetWeightLb: 200,
};

describe('prefill order', () => {
  const last = [set({ weightLb: 225, reps: 5 }), set({ weightLb: 225, reps: 4 })];

  it('1) uses the same set number from last session first', () => {
    expect(
      prefillSet({ type: 'weighted', setIndex: 1, lastSession: last, currentSets: [], target }),
    ).toEqual({ weightLb: 225, reps: 4 });
  });

  it('2) else the previous set in this workout', () => {
    const current = [set({ weightLb: 230, reps: 3, done: false })];
    expect(
      prefillSet({
        type: 'weighted',
        setIndex: 2,
        lastSession: last,
        currentSets: [...current, set({ weightLb: 235, reps: 2 })],
        target,
      }),
    ).toEqual({ weightLb: 235, reps: 2 });
  });

  it('3) else the preset targets', () => {
    expect(prefillSet({ type: 'weighted', setIndex: 0, currentSets: [], target })).toEqual({
      weightLb: 200,
      reps: 5,
    });
  });

  it('4) else nothing', () => {
    expect(prefillSet({ type: 'weighted', setIndex: 0, currentSets: [] })).toEqual({});
  });

  it('only returns the fields the type logs', () => {
    expect(
      prefillSet({
        type: 'cardio',
        setIndex: 0,
        currentSets: [],
        target: { ...target, targetTimeSec: 600, targetDistance: 1 },
      }),
    ).toEqual({ timeSec: 600, distance: 1 });
    expect(
      prefillSet({
        type: 'timed',
        setIndex: 0,
        lastSession: [set({ timeSec: 60, reps: 9 })],
        currentSets: [],
      }),
    ).toEqual({ timeSec: 60 });
  });
});

describe('session max per type', () => {
  it('weighted: heaviest weight, ties broken by reps', () => {
    const m = sessionMax('weighted', [
      set({ weightLb: 225, reps: 5 }),
      set({ weightLb: 245, reps: 2 }),
      set({ weightLb: 245, reps: 3 }),
      set({ weightLb: 315, reps: 1, done: false }), // not done: ignored
    ]);
    expect(m?.value).toBe(245);
    expect(m?.set.reps).toBe(3);
  });

  it('bodyweight: most reps in one set', () => {
    expect(sessionMax('bodyweight', [set({ reps: 8 }), set({ reps: 12 })])?.value).toBe(12);
  });

  it('timed: longest time', () => {
    expect(sessionMax('timed', [set({ timeSec: 60 }), set({ timeSec: 75 })])?.value).toBe(75);
  });

  it('carry: heaviest weight, ties broken by distance', () => {
    const m = sessionMax('carry', [
      set({ weightLb: 70, distance: 40 }),
      set({ weightLb: 70, distance: 60 }),
    ]);
    expect(m?.value).toBe(70);
    expect(m?.set.distance).toBe(60);
  });

  it('distance: farthest', () => {
    expect(sessionMax('distance', [set({ distance: 20 }), set({ distance: 40 })])?.value).toBe(40);
  });

  it('cardio: distance by default, time with the toggle', () => {
    const sets = [set({ distance: 3, timeSec: 1500 }), set({ distance: 1, timeSec: 2000 })];
    expect(sessionMax('cardio', sets)?.value).toBe(3);
    expect(sessionMax('cardio', sets, 'time')?.value).toBe(2000);
  });

  it('is undefined with no usable done sets', () => {
    expect(sessionMax('weighted', [])).toBeUndefined();
    expect(sessionMax('weighted', [set({ reps: 5 })])).toBeUndefined();
    expect(metricValue('bodyweight', set({ reps: 7 }))).toBe(7);
  });
});

describe('pace and set lines', () => {
  it('formats pace as m:ss /mi', () => {
    expect(formatPace(570, 1)).toBe('9:30 /mi');
    expect(formatPace(1500, 3)).toBe('8:20 /mi');
    expect(formatPace(1000, 1.5)).toBe('11:07 /mi');
    expect(formatPace(600, 0)).toBeUndefined();
    expect(formatPace(undefined, 2)).toBeUndefined();
  });

  it('summarizes sets per type', () => {
    expect(setSummary({ weightLb: 225, reps: 5 }, { type: 'weighted' })).toBe('225 lb × 5');
    expect(setSummary({ reps: 8, weightLb: 25 }, { type: 'bodyweight' })).toBe('8 reps +25 lb');
    expect(setSummary({ timeSec: 60 }, { type: 'timed' })).toBe('1:00');
    expect(setSummary({ weightLb: 70, distance: 40 }, { type: 'carry', distUnit: 'yd' })).toBe(
      '70 lb × 40 yd',
    );
    expect(setSummary({ distance: 20, weightLb: 180 }, { type: 'distance', distUnit: 'yd' })).toBe(
      '20 yd @ 180 lb',
    );
    expect(setSummary({ distance: 1, timeSec: 570 }, { type: 'cardio' })).toBe('1.00 mi · 9:30');
    expect(setSummary({}, { type: 'weighted' })).toBe('— lb × —');
  });

  it('builds the "Last time" line', () => {
    const sets = [
      { weightLb: 225, reps: 5 },
      { weightLb: 225, reps: 4 },
    ];
    expect(lastTimeLine(sets, { type: 'weighted' })).toBe('225×5 · 225×4');
    expect(setShort({ distance: 1, timeSec: 570 }, { type: 'cardio' })).toBe(
      '1.00 mi in 9:30 · 9:30 /mi',
    );
    expect(setShort({ reps: 8, weightLb: 25 }, { type: 'bodyweight' })).toBe('+25×8');
  });
});
