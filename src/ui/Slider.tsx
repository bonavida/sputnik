import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { pointerPreview } from '@/utils/slider';
import type { SliderPreview } from '@/utils/slider';

// Also the length of the bar ends that the thumb center never reaches
const THUMB_PX = 12;

interface SliderProps {
  label: string;
  value: number;
  max: number;
  step?: number;
  /** Human-readable value for screen readers, e.g. "1:24 of 3:42" */
  valueText?: string;
  /** Shows the value under the mouse pointer in a tooltip */
  formatPreview?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Native range input (keyboard and screen reader support for free) over a
 * drawn bar. The bar spans the thumb center's travel, so the thumb always sits
 * exactly at the end of the fill.
 */
export const Slider = ({
  label,
  value,
  max,
  step = 1,
  valueText,
  formatPreview,
  onChange,
  disabled,
  className = '',
}: SliderProps) => {
  const [preview, setPreview] = useState<SliderPreview>();
  const current = Math.min(value, max);
  const fraction = max > 0 ? current / max : 0;

  const updatePreview = (event: MouseEvent<HTMLInputElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    setPreview(pointerPreview(event.clientX - left, width, max, THUMB_PX));
  };

  return (
    <span
      style={
        { '--fill': fraction, '--thumb': `${THUMB_PX}px` } as CSSProperties
      }
      className={`relative flex items-center has-disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true" className="slider-track" />
      <span aria-hidden="true" className="slider-fill" />
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={current}
        aria-label={label}
        aria-valuetext={valueText}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        onMouseMove={formatPreview ? updatePreview : undefined}
        onMouseLeave={() => setPreview(undefined)}
        className="slider no-drag"
      />
      {formatPreview && preview && !disabled && (
        <span
          role="tooltip"
          style={{ left: preview.x }}
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-fg px-1.5 py-0.5 text-xs tabular-nums text-canvas shadow-md"
        >
          {formatPreview(preview.value)}
        </span>
      )}
    </span>
  );
};
