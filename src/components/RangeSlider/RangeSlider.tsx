import { useMemo, ChangeEvent } from 'react';
/** Styles */
import './RangeSlider.scss';

interface RangeSliderProps {
  min: number | string | undefined;
  max: number | undefined;
  step: number | undefined;
  value: number | undefined;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  classes?: string;
}

const RangeSlider = ({
  classes,
  onChange,
  value = 0,
  max = 0,
  ...props
}: RangeSliderProps) => {
  const percentage = useMemo(() => {
    if (!max) return 0;
    return (value / max) * 100;
  }, [value, max]);

  return (
    <div className="slider-container">
      <div
        className="progress-bar-cover"
        style={{
          width: `${percentage}%`,
        }}
      />
      <div
        className="thumb"
        style={{
          left: `${percentage}%`,
          ...(!percentage && { marginLeft: 0 }),
        }}
      />
      <input
        type="range"
        value={percentage}
        className={`slider ${classes}`}
        onInput={onChange}
        {...props}
      />
    </div>
  );
};

RangeSlider.defaultProps = {
  classes: '',
};

export default RangeSlider;
