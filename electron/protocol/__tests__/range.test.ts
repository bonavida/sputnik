import { describe, expect, it } from 'vitest';
import { parseRange } from '../range';

const SIZE = 1_000;

describe('parseRange', () => {
  it('serves the full file without a Range header', () => {
    expect(parseRange(null, SIZE)).toEqual({ kind: 'full' });
    expect(parseRange('', SIZE)).toEqual({ kind: 'full' });
  });

  it.each([
    ['bytes=0-', 0, 999],
    ['bytes=100-199', 100, 199],
    ['bytes=900-5000', 900, 999],
    ['bytes=-500', 500, 999],
    ['bytes=-5000', 0, 999],
  ])('%s → %i-%i', (header, start, end) => {
    expect(parseRange(header, SIZE)).toEqual({
      kind: 'partial',
      range: { start, end },
    });
  });

  it.each(['bytes=1000-', 'bytes=5000-6000', 'bytes=-0'])(
    '%s is unsatisfiable',
    (header) => {
      expect(parseRange(header, SIZE)).toEqual({ kind: 'unsatisfiable' });
    }
  );

  it('treats any range on an empty file as unsatisfiable', () => {
    expect(parseRange('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' });
    expect(parseRange('bytes=-10', 0)).toEqual({ kind: 'unsatisfiable' });
  });

  it.each([
    'bytes=0-10,20-30',
    'items=0-10',
    'bytes=abc',
    'bytes=-',
    'bytes=200-100',
  ])('ignores %s and serves the full file (RFC 9110)', (header) => {
    expect(parseRange(header, SIZE)).toEqual({ kind: 'full' });
  });
});
