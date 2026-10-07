import type { Rgb } from '@shared/types';

const BYTES_PER_PIXEL = 4;
const HUE_BUCKETS = 24;
const MIN_ALPHA = 128;
const MIN_SATURATION = 0.18;
const MIN_VALUE = 0.15;
// Below this share of colorful pixels the cover counts as black/white/gray
const MIN_CHROMATIC_SHARE = 0.05;

export type ChannelOrder = 'bgra' | 'rgba';

interface Bucket {
  weight: number;
  r: number;
  g: number;
  b: number;
}

const hueOf = (r: number, g: number, b: number, max: number, delta: number) => {
  if (max === r) return ((g - b) / delta + 6) % 6;
  if (max === g) return (b - r) / delta + 2;
  return (r - g) / delta + 4;
};

/**
 * Most representative saturated color of a small bitmap (e.g. a 32×32 cover).
 * Pixels are grouped by hue and weighted by chroma, so a vivid area wins over a
 * larger washed-out one and white/black backgrounds are ignored.
 * Returns undefined for achromatic images.
 */
export const dominantColor = (
  bitmap: Uint8Array,
  order: ChannelOrder = 'bgra'
): Rgb | undefined => {
  const [rIndex, bIndex] = order === 'bgra' ? [2, 0] : [0, 2];
  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({
    weight: 0,
    r: 0,
    g: 0,
    b: 0,
  }));
  const pixelCount = Math.floor(bitmap.length / BYTES_PER_PIXEL);
  let opaque = 0;
  let chromatic = 0;

  for (
    let offset = 0;
    offset < pixelCount * BYTES_PER_PIXEL;
    offset += BYTES_PER_PIXEL
  ) {
    if ((bitmap[offset + 3] ?? 0) < MIN_ALPHA) continue;
    opaque += 1;

    const r = bitmap[offset + rIndex] ?? 0;
    const g = bitmap[offset + 1] ?? 0;
    const b = bitmap[offset + bIndex] ?? 0;
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    const value = max / 255;
    const saturation = max === 0 ? 0 : delta / max;
    if (value < MIN_VALUE || saturation < MIN_SATURATION) continue;

    chromatic += 1;
    const bucket =
      buckets[
        Math.floor((hueOf(r, g, b, max, delta) / 6) * HUE_BUCKETS) % HUE_BUCKETS
      ];
    if (!bucket) continue;
    const weight = (delta / 255) * value;
    bucket.weight += weight;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
  }

  if (opaque === 0 || chromatic / opaque < MIN_CHROMATIC_SHARE)
    return undefined;

  const best = buckets.reduce((top, bucket) =>
    bucket.weight > top.weight ? bucket : top
  );
  if (best.weight === 0) return undefined;
  return [
    Math.round(best.r / best.weight),
    Math.round(best.g / best.weight),
    Math.round(best.b / best.weight),
  ];
};
