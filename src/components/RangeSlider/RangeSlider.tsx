import { useState, useEffect, memo, ChangeEvent } from 'react';

interface RangeSliderProps {
  min: number | string | undefined;
  max: number | string | undefined;
  step: number | string | undefined;
  value?: string | number | undefined;
  onChange?: (val: string | number | undefined) => void;
  onSlide?: (val: string | number | undefined) => void;
  classes?: string;
}

const RangeSlider = ({
  classes,
  onChange,
  onSlide,
  value,
  ...sliderProps
}: RangeSliderProps) => {
  const [sliderVal, setSliderVal] = useState<string | number | undefined>(
    value
  );
  const [mouseState, setMouseState] = useState<string | null>(null);

  useEffect(() => {
    setSliderVal(value);
  }, [value]);

  useEffect(() => {
    if (!onSlide || !mouseState) return;
    onSlide(sliderVal);
  }, [sliderVal]);

  useEffect(() => {
    if (!onChange || mouseState !== 'up') return;
    onChange(sliderVal);
  }, [mouseState]);

  const changeCallback = (e: ChangeEvent<HTMLInputElement>) => {
    setSliderVal(e.target.value);
  };

  return (
    <div className="range-slider">
      <input
        type="range"
        value={sliderVal ?? ''}
        {...sliderProps}
        className={`slider ${classes}`}
        onChange={changeCallback}
        onMouseDown={() => setMouseState('down')}
        onMouseUp={() => setMouseState('up')}
      />
    </div>
  );
};

RangeSlider.defaultProps = {
  value: '',
  onChange: () => '',
  onSlide: () => '',
  classes: '',
};

export default memo(RangeSlider);
