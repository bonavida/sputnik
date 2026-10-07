import { describe, expect, it } from 'vitest';
import type { Rgb } from '@shared/types';
import { dominantColor } from '../dominantColor';

const SIDE = 32;

/** BGRA bitmap where `paint(x, y)` decides each pixel's RGB color */
const bitmap = (
  paint: (x: number, y: number) => Rgb,
  alpha = 255
): Uint8Array =>
  Uint8Array.from(
    Array.from({ length: SIDE * SIDE }, (_, index) => {
      const [r, g, b] = paint(index % SIDE, Math.floor(index / SIDE));
      return [b, g, r, alpha];
    }).flat()
  );

const RED: Rgb = [220, 30, 40];
const BLUE: Rgb = [30, 60, 200];
const WHITE: Rgb = [250, 250, 250];

describe('dominantColor', () => {
  it('returns the color of a solid cover', () => {
    expect(dominantColor(bitmap(() => BLUE))).toEqual(BLUE);
  });

  it('ignores a mostly white background and picks the colorful area', () => {
    const cover = bitmap((x, y) => (x < 10 && y < 10 ? RED : WHITE));
    expect(dominantColor(cover)).toEqual(RED);
  });

  it('prefers a vivid area over a larger washed-out one', () => {
    const paleBlue: Rgb = [170, 180, 205];
    const cover = bitmap((x) => (x < 12 ? RED : paleBlue));
    expect(dominantColor(cover)).toEqual(RED);
  });

  it('reads RGBA bitmaps when asked to', () => {
    const rgba = Uint8Array.from(
      Array.from({ length: SIDE * SIDE }, () => [...RED, 255]).flat()
    );
    expect(dominantColor(rgba, 'rgba')).toEqual(RED);
  });

  it.each([
    ['grayscale', bitmap((x) => [x * 8, x * 8, x * 8])],
    ['black', bitmap(() => [5, 5, 5])],
    ['transparent', bitmap(() => RED, 0)],
    ['empty', new Uint8Array()],
  ])('returns undefined for a %s image', (_, image) => {
    expect(dominantColor(image)).toBeUndefined();
  });
});
