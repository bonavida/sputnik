import { describe, expect, it } from 'vitest';
import { pointerPreview } from './slider';

const WIDTH = 212;
const THUMB = 12;
const MAX = 200;

describe('pointerPreview', () => {
  // Chromium puts the thumb center under the pointer, so the value range maps to
  // the span between half a thumb from each edge (here 6..206 px)
  it.each([
    [6, 0],
    [56, 50],
    [106, 100],
    [206, 200],
  ])('at %i px previews %i', (offsetX, value) => {
    expect(pointerPreview(offsetX, WIDTH, MAX, THUMB)).toEqual({
      x: offsetX,
      value,
    });
  });

  it('clamps to the ends of the track', () => {
    expect(pointerPreview(0, WIDTH, MAX, THUMB)).toEqual({ x: 6, value: 0 });
    expect(pointerPreview(WIDTH + 30, WIDTH, MAX, THUMB)).toEqual({
      x: 206,
      value: 200,
    });
  });

  it('does not divide by zero on a slider narrower than its thumb', () => {
    expect(pointerPreview(5, 10, MAX, THUMB).value).toBe(0);
  });
});
