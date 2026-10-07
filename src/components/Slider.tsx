import type { CSSProperties } from 'react';

interface SliderProps {
  label: string;
  value: number;
  max: number;
  step?: number;
  /** Human-readable value for screen readers, e.g. "1:24 of 3:42" */
  valueText?: string;
  onChange: (value: number) => void;
  className?: string;
}

/** Native range input: keyboard and screen reader support come for free */
export const Slider = ({
  label,
  value,
  max,
  step = 1,
  valueText,
  onChange,
  className = '',
}: SliderProps) => {
  const fill = max > 0 ? (Math.min(value, max) / max) * 100 : 0;
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={Math.min(value, max)}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      style={{ '--fill': `${fill}%` } as CSSProperties}
      className={`slider no-drag ${className}`}
    />
  );
};
