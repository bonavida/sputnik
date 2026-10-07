import { describe, expect, it } from 'vitest';
import type { Rgb } from '@shared/types';
import type { Mode, Palette } from '../color';
import {
  NEUTRAL_PALETTES,
  TEXT_CONTRAST,
  UI_CONTRAST,
  buildPalette,
  contrastRatio,
  fromHex,
  oklchToRgb,
  rgbToOklch,
  toHex,
} from '../color';

const MODES: Mode[] = ['light', 'dark'];
// Smallest OKLab lightness gap that still reads as a separate surface
const MIN_LAYER_STEP = 0.025;

const contrast = (
  palette: Palette,
  foreground: keyof Palette,
  background: keyof Palette
) => contrastRatio(fromHex(palette[foreground]), fromHex(palette[background]));

/** Every rule the UI relies on to stay readable */
const expectReadable = (palette: Palette) => {
  (['canvas', 'panel', 'raised'] as const).forEach((background) => {
    expect(contrast(palette, 'fg', background)).toBeGreaterThanOrEqual(
      TEXT_CONTRAST
    );
    expect(contrast(palette, 'fgMuted', background)).toBeGreaterThanOrEqual(
      TEXT_CONTRAST
    );
    // The playing row uses the accent as text color
    expect(contrast(palette, 'accent', background)).toBeGreaterThanOrEqual(
      TEXT_CONTRAST
    );
  });
  // Play button: canvas-colored icon on an accent-colored circle
  expect(contrast(palette, 'canvas', 'accent')).toBeGreaterThanOrEqual(
    UI_CONTRAST
  );
};

const lightness = (palette: Palette, token: keyof Palette) =>
  rgbToOklch(fromHex(palette[token])).l;

/** Panels stand out from the window, and hovered rows from the panels */
const expectLayered = (mode: Mode, palette: Palette) => {
  const [canvas, panel, raised] = (['canvas', 'panel', 'raised'] as const).map(
    (token) => lightness(palette, token)
  ) as [number, number, number];
  // Dark themes get lighter as surfaces rise; light themes get darker
  const rise = mode === 'dark' ? 1 : -1;
  expect((panel - canvas) * rise).toBeGreaterThan(MIN_LAYER_STEP);
  expect((raised - panel) * rise).toBeGreaterThan(MIN_LAYER_STEP);
};

describe('color conversions', () => {
  it.each<Rgb>([
    [0, 0, 0],
    [255, 255, 255],
    [220, 30, 40],
    [30, 60, 200],
    [57, 255, 20],
    [128, 128, 128],
  ])('round-trips %j through OKLCH', (...rgb) => {
    oklchToRgb(rgbToOklch(rgb)).forEach((channel, index) => {
      expect(channel).toBeCloseTo(rgb[index] as number, -0.5);
    });
  });

  it('brings out-of-gamut colors into sRGB keeping the hue', () => {
    const rgb = oklchToRgb({ l: 0.7, c: 0.4, h: 145 });

    rgb.forEach((channel) => expect(channel).toBeGreaterThanOrEqual(0));
    rgb.forEach((channel) => expect(channel).toBeLessThanOrEqual(255));
    expect(rgbToOklch(rgb).h).toBeCloseTo(145, -1);
  });

  it('converts to and from hex', () => {
    expect(toHex([255, 8, 0])).toBe('#ff0800');
    expect(fromHex('#ff0800')).toEqual([255, 8, 0]);
  });
});

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
    // #767676 on white is the classic 4.54:1 gray
    expect(contrastRatio(fromHex('#767676'), [255, 255, 255])).toBeCloseTo(
      4.54,
      1
    );
  });

  it('is symmetric', () => {
    expect(contrastRatio([10, 120, 200], [250, 250, 240])).toBe(
      contrastRatio([250, 250, 240], [10, 120, 200])
    );
  });
});

describe('buildPalette', () => {
  it.each(MODES)('keeps the neutral %s palette readable', (mode) => {
    expect(buildPalette(mode)).toBe(NEUTRAL_PALETTES[mode]);
    expectReadable(NEUTRAL_PALETTES[mode]);
    expectLayered(mode, NEUTRAL_PALETTES[mode]);
  });

  it.each<[string, Rgb]>([
    ['white', [255, 255, 255]],
    ['black', [0, 0, 0]],
    ['gray', [128, 128, 128]],
    ['near-gray beige', [200, 196, 190]],
  ])('uses the neutral palette for a %s cover', (_, cover) => {
    MODES.forEach((mode) =>
      expect(buildPalette(mode, cover)).toBe(NEUTRAL_PALETTES[mode])
    );
  });

  // Sweep: 24 hues × 3 chromas × 3 lightnesses × 2 modes
  const sweep = Array.from({ length: 24 }, (_, index) => index * 15).flatMap(
    (h) =>
      [0.05, 0.12, 0.25].flatMap((c) =>
        [0.3, 0.6, 0.9].map((l) => ({ l, c, h }))
      )
  );

  it.each(MODES)(
    'generates readable, layered %s palettes for any cover color',
    (mode) => {
      sweep.forEach((color) => {
        const palette = buildPalette(mode, oklchToRgb(color));
        expectReadable(palette);
        expectLayered(mode, palette);
      });
    }
  );

  it.each<[string, Rgb]>([
    ['saturated red', [220, 20, 30]],
    ['neon green', [57, 255, 20]],
    ['navy', [0, 0, 128]],
    ['pastel pink', [248, 200, 220]],
  ])('handles a %s cover', (_, cover) => {
    MODES.forEach((mode) => expectReadable(buildPalette(mode, cover)));
  });

  it('keeps the cover hue but tones down its chroma', () => {
    const cover: Rgb = [220, 20, 30];
    const { h } = rgbToOklch(cover);

    MODES.forEach((mode) => {
      const canvas = rgbToOklch(fromHex(buildPalette(mode, cover).canvas));
      expect(canvas.c).toBeLessThanOrEqual(0.06);
      expect(Math.abs(canvas.h - h)).toBeLessThan(15);
    });
  });
});
