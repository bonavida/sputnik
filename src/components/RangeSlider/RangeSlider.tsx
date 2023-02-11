interface RangeSliderProps {
  min: number | string | undefined;
  max: number | string | undefined;
  step: number | string | undefined;
  value: string | number | undefined;
  onChange: (val: string | number | undefined) => void;
  classes: string;
}

const RangeSlider = ({
  classes,
  onChange,
  value,
  ...sliderProps
}: RangeSliderProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="range-slider">
      <input
        type="range"
        value={value ?? ''}
        {...sliderProps}
        className={`slider ${classes}`}
        onChange={handleChange}
      />
    </div>
  );
};

export default RangeSlider;
