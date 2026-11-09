import { describe, expect, it } from 'vitest';
import {
  defaultTargetSets,
  distUnitFor,
  formatDistance,
  formatDuration,
  formatWeight,
  parseDuration,
  targetSummary,
} from './format';
import type { PresetItem } from './types';

const item = (p: Partial<PresetItem>): PresetItem => ({
  id: 'i',
  exerciseId: 'e',
  targetSets: 3,
  ...p,
});

describe('formatDuration', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
  it('clamps negatives and rounds', () => {
    expect(formatDuration(-4)).toBe('0:00');
    expect(formatDuration(59.6)).toBe('1:00');
  });
});

describe('parseDuration', () => {
  it('parses m:ss and h:mm:ss', () => {
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('0:05')).toBe(5);
    expect(parseDuration('1:02:05')).toBe(3725);
    expect(parseDuration(' 2:00 ')).toBe(120);
  });
  it('reads digits like a microwave timer (no ":" on the number pad)', () => {
    expect(parseDuration('45')).toBe(45);
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('130')).toBe(90);
    expect(parseDuration('4500')).toBe(2700);
    expect(parseDuration('13000')).toBe(5400);
    expect(parseDuration('0')).toBe(0);
  });
  it('rejects invalid input', () => {
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('abc')).toBeUndefined();
    expect(parseDuration('1:75')).toBeUndefined();
    expect(parseDuration('1:60:00')).toBeUndefined();
    expect(parseDuration('1:2:3:4')).toBeUndefined();
    expect(parseDuration('-1:00')).toBeUndefined();
    expect(parseDuration('1.5')).toBeUndefined();
  });
});

describe('units', () => {
  it('formats weight and distance in imperial units', () => {
    expect(formatWeight(225)).toBe('225 lb');
    expect(formatWeight(52.5)).toBe('52.5 lb');
    expect(formatDistance(2, 'mi')).toBe('2.00 mi');
    expect(formatDistance(3.1, 'mi')).toBe('3.10 mi');
    expect(formatDistance(40, 'yd')).toBe('40 yd');
    expect(formatDistance(100, 'ft')).toBe('100 ft');
  });
  it('picks the right distance unit', () => {
    expect(distUnitFor({ type: 'cardio' })).toBe('mi');
    expect(distUnitFor({ type: 'carry', distUnit: 'ft' })).toBe('ft');
    expect(distUnitFor({ type: 'distance' })).toBe('yd');
  });
  it('defaults cardio to 1 set and everything else to 3', () => {
    expect(defaultTargetSets('cardio')).toBe(1);
    expect(defaultTargetSets('weighted')).toBe(3);
  });
});

describe('targetSummary', () => {
  it('weighted', () => {
    expect(targetSummary(item({ targetReps: 5, targetWeightLb: 225 }), { type: 'weighted' })).toBe(
      '3 × 5 @ 225 lb',
    );
    expect(targetSummary(item({}), { type: 'weighted' })).toBe('3 sets');
  });
  it('bodyweight, with and without added weight', () => {
    expect(targetSummary(item({ targetReps: 8 }), { type: 'bodyweight' })).toBe('3 × 8');
    expect(targetSummary(item({ targetReps: 8, targetWeightLb: 25 }), { type: 'bodyweight' })).toBe(
      '3 × 8 @ +25 lb',
    );
  });
  it('timed', () => {
    expect(targetSummary(item({ targetTimeSec: 60 }), { type: 'timed' })).toBe('3 × 1:00');
    expect(targetSummary(item({ targetTimeSec: 45, targetWeightLb: 45 }), { type: 'timed' })).toBe(
      '3 × 0:45 @ 45 lb',
    );
  });
  it('carry', () => {
    expect(
      targetSummary(item({ targetDistance: 40, targetWeightLb: 70 }), {
        type: 'carry',
        distUnit: 'yd',
      }),
    ).toBe('3 × 40 yd @ 70 lb');
  });
  it('distance (sled)', () => {
    expect(
      targetSummary(item({ targetSets: 4, targetDistance: 20, targetWeightLb: 180 }), {
        type: 'distance',
        distUnit: 'yd',
      }),
    ).toBe('4 × 20 yd @ 180 lb');
    expect(targetSummary(item({ targetDistance: 50 }), { type: 'distance', distUnit: 'ft' })).toBe(
      '3 × 50 ft',
    );
  });
  it('cardio', () => {
    expect(
      targetSummary(item({ targetSets: 1, targetDistance: 2 }), { type: 'cardio', distUnit: 'mi' }),
    ).toBe('1 × 2.00 mi');
    expect(
      targetSummary(item({ targetSets: 1, targetDistance: 3, targetTimeSec: 1500 }), {
        type: 'cardio',
      }),
    ).toBe('1 × 3.00 mi · 25:00');
    expect(targetSummary(item({ targetSets: 1, targetTimeSec: 1200 }), { type: 'cardio' })).toBe(
      '1 × 20:00',
    );
    expect(targetSummary(item({ targetSets: 1 }), { type: 'cardio' })).toBe('1 set');
  });
  it('appends a rest override', () => {
    expect(
      targetSummary(item({ targetReps: 5, targetWeightLb: 225, restSec: 120 }), {
        type: 'weighted',
      }),
    ).toBe('3 × 5 @ 225 lb · rest 2:00');
  });
});
