import { describe, expect, it } from 'vitest';
import { isNewerVersion } from '../version';

describe('isNewerVersion', () => {
  it.each([
    ['2.2.0', '2.1.0'],
    ['v2.1.1', '2.1.0'],
    ['3.0.0', '2.9.9'],
    ['2.10.0', '2.9.1'],
    ['2.0.0', '2.0.0-alpha.0'],
  ])('%s is newer than %s', (candidate, current) => {
    expect(isNewerVersion(candidate, current)).toBe(true);
  });

  it.each([
    ['2.1.0', '2.1.0'],
    ['2.0.9', '2.1.0'],
    ['2.9.1', '2.10.0'],
    ['2.2.0-beta.1', '2.1.0'],
    ['not a version', '2.1.0'],
    ['2.2', '2.1.0'],
  ])('%s is not offered over %s', (candidate, current) => {
    expect(isNewerVersion(candidate, current)).toBe(false);
  });
});
