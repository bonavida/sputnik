import type { Rgb } from '@shared/types';

export type Mode = 'light' | 'dark';

/** Theme tokens as #rrggbb, applied as CSS variables (see index.css) */
export interface Palette {
  /** Window background: title bar, player bar and the gaps between panels */
  canvas: string;
  /** The now playing and playlist panels */
  panel: string;
  /** Hovered and selected rows, menus and other surfaces on top of a panel */
  raised: string;
  fg: string;
  fgMuted: string;
  line: string;
  accent: string;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Token = keyof Palette;

export const TEXT_CONTRAST = 4.5;
export const UI_CONTRAST = 3;
// Below this chroma a cover reads as black, white or gray: use the neutral theme
const MIN_TINT_CHROMA = 0.03;
const LIGHTNESS_STEP = 0.01;

export const NEUTRAL_PALETTES: Record<Mode, Palette> = {
  light: {
    canvas: '#fafaf8',
    panel: '#efefec',
    raised: '#e4e4e0',
    fg: '#1b1b1b',
    fgMuted: '#62625f',
    line: '#d9d9d4',
    accent: '#1b1b1b',
  },
  dark: {
    canvas: '#0f0f0f',
    panel: '#181818',
    raised: '#282828',
    fg: '#f1f1f1',
    fgMuted: '#a3a3a3',
    line: '#333333',
    accent: '#f1f1f1',
  },
};

/**
 * Target lightness and maximum chroma per token. The cover only lends its hue:
 * chroma is capped so backgrounds stay calm, CarPlay style. Surfaces rise from
 * canvas to panel to raised: lighter in dark mode, darker in light mode.
 */
const TINT_TARGETS: Record<Mode, Record<Token, { l: number; c: number }>> = {
  dark: {
    canvas: { l: 0.22, c: 0.045 },
    panel: { l: 0.27, c: 0.05 },
    raised: { l: 0.33, c: 0.055 },
    fg: { l: 0.97, c: 0.012 },
    fgMuted: { l: 0.8, c: 0.03 },
    line: { l: 0.4, c: 0.045 },
    accent: { l: 0.86, c: 0.1 },
  },
  light: {
    canvas: { l: 0.975, c: 0.012 },
    panel: { l: 0.945, c: 0.02 },
    raised: { l: 0.905, c: 0.03 },
    fg: { l: 0.24, c: 0.035 },
    fgMuted: { l: 0.46, c: 0.035 },
    line: { l: 0.86, c: 0.03 },
    accent: { l: 0.42, c: 0.12 },
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) =>
  255 *
  (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

// OKLab matrices from Björn Ottosson, https://bottosson.github.io/posts/oklab/
export const rgbToOklch = ([red, green, blue]: Rgb): Oklch => {
  const [r, g, b] = [toLinear(red), toLinear(green), toLinear(blue)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(bAxis, a) * 180) / Math.PI;

  return { l: lightness, c: Math.hypot(a, bAxis), h: (hue + 360) % 360 };
};

/** Linear sRGB channels, possibly outside [0, 1] when the color is out of gamut */
const oklchToLinear = ({
  l: lightness,
  c,
  h,
}: Oklch): [number, number, number] => {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const isInGamut = (color: Oklch) =>
  oklchToLinear(color).every(
    (channel) => channel >= -1e-4 && channel <= 1 + 1e-4
  );

const GAMUT_SEARCH_STEPS = 16;

/** Highest chroma (same hue and lightness) that fits in sRGB, by binary search */
const fitChroma = (color: Oklch): number => {
  if (isInGamut(color)) return color.c;
  const { low } = Array.from({ length: GAMUT_SEARCH_STEPS }).reduce<{
    low: number;
    high: number;
  }>(
    ({ low: min, high: max }) => {
      const middle = (min + max) / 2;
      return isInGamut({ ...color, c: middle })
        ? { low: middle, high: max }
        : { low: min, high: middle };
    },
    { low: 0, high: color.c }
  );
  return low;
};

const toChannel = (linear: number) =>
  Math.round(clamp(fromLinear(clamp(linear, 0, 1)), 0, 255));

/** Converts to sRGB, lowering chroma (never hue or lightness) until it fits */
export const oklchToRgb = (color: Oklch): Rgb => {
  const [r, g, b] = oklchToLinear({ ...color, c: fitChroma(color) });
  return [toChannel(r), toChannel(g), toChannel(b)];
};

export const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

export const fromHex = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

/** WCAG 2 relative luminance */
const luminance = ([r, g, b]: Rgb) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export const contrastRatio = (first: Rgb, second: Rgb): number => {
  const [light, dark] = [luminance(first), luminance(second)].toSorted(
    (a, b) => b - a
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

/** Moves lightness away from the backgrounds until the color is readable on all of them */
const ensureContrast = (
  color: Oklch,
  backgrounds: Rgb[],
  minimum: number,
  mode: Mode
): Oklch => {
  const direction = mode === 'dark' ? 1 : -1;
  const steps = Math.ceil(1 / LIGHTNESS_STEP);
  const candidates = Array.from({ length: steps + 1 }, (_, index) => ({
    ...color,
    l: clamp(color.l + direction * index * LIGHTNESS_STEP, 0, 1),
  }));
  return (
    candidates.find((candidate) => {
      const rgb = oklchToRgb(candidate);
      return backgrounds.every(
        (background) => contrastRatio(rgb, background) >= minimum
      );
    }) ?? { ...color, l: mode === 'dark' ? 1 : 0, c: 0 }
  );
};

export const buildPalette = (mode: Mode, cover?: Rgb): Palette => {
  const source = cover ? rgbToOklch(cover) : undefined;
  if (!source || source.c < MIN_TINT_CHROMA) return NEUTRAL_PALETTES[mode];

  const targets = TINT_TARGETS[mode];
  const tinted = (token: Token): Oklch => ({
    l: targets[token].l,
    c: Math.min(targets[token].c, source.c),
    h: source.h,
  });

  const canvas = oklchToRgb(tinted('canvas'));
  const panel = oklchToRgb(tinted('panel'));
  const raised = oklchToRgb(tinted('raised'));
  const readable = (token: Token) =>
    toHex(
      oklchToRgb(
        ensureContrast(
          tinted(token),
          [canvas, panel, raised],
          TEXT_CONTRAST,
          mode
        )
      )
    );

  return {
    canvas: toHex(canvas),
    panel: toHex(panel),
    raised: toHex(raised),
    fg: readable('fg'),
    fgMuted: readable('fgMuted'),
    line: toHex(oklchToRgb(tinted('line'))),
    accent: readable('accent'),
  };
};
