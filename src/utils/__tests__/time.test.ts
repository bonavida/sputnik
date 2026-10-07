import { describe, expect, it } from 'vitest';
import { formatTime, formatTotal } from '../time';

describe('formatTime', () => {
  it.each([
    [undefined, '0:00'],
    [Number.NaN, '0:00'],
    [Number.POSITIVE_INFINITY, '0:00'],
    [-3, '0:00'],
    [0, '0:00'],
    [59.9, '0:59'],
    [61, '1:01'],
    [600, '10:00'],
    [3_600, '1:00:00'],
    [3_661, '1:01:01'],
  ])('%s → %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});

describe('formatTotal', () => {
  it.each([
    [0, '0 min'],
    [4, '1 min'],
    [89, '1 min'],
    [2_880, '48 min'],
    [4_320, '1 h 12 min'],
  ])('%s s → %s', (seconds, expected) => {
    expect(formatTotal(seconds)).toBe(expected);
  });
});
