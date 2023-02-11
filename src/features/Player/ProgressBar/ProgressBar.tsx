/** Components */
import RangeSlider from '@components/RangeSlider';
import { useState } from 'react';
/** Styles */
import './ProgressBar.scss';

const ProgressBar = () => {
  const [val, setVal] = useState<string | number | undefined>(10);

  const handleChange = (value: string | number | undefined) => {
    console.log(value);
    setVal(value);
  };

  return (
    <RangeSlider
      min={0}
      max={100}
      value={val}
      step={1}
      onChange={handleChange}
      classes="additional-css-classes"
    />
  );
};

export default ProgressBar;
