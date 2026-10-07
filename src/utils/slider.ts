export interface SliderPreview {
  /** Horizontal position of the thumb center for that value, in px */
  x: number;
  value: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Value a click at `offsetX` would jump to. Chromium centers the range thumb
 * under the pointer, so the thumb center travels from half a thumb to the width
 * minus half a thumb.
 */
export const pointerPreview = (
  offsetX: number,
  width: number,
  max: number,
  thumb: number
): SliderPreview => {
  const track = width - thumb;
  if (track <= 0) return { x: width / 2, value: 0 };
  const fraction = clamp((offsetX - thumb / 2) / track, 0, 1);
  return { x: thumb / 2 + fraction * track, value: fraction * max };
};
