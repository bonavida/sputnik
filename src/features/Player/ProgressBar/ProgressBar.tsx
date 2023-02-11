/** Components */
import RangeSlider from '@components/RangeSlider';
/** Hooks */
import { useEffect } from 'react';
/** Styles */
import './ProgressBar.scss';

const ProgressBar = () => {
  const handleSlide = (value: string | number | undefined) => {
    console.log('slide');
  };
  const handleChange = (value: string | number | undefined) => {
    console.log('up');
  };

  return (
    <RangeSlider
      min={0}
      max={100}
      value={10}
      step={2}
      onSlide={handleSlide}
      onChange={handleChange}
      classes="additional-css-classes"
    />
  );
};

export default ProgressBar;
