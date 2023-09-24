import { ChangeEvent } from 'react';
/** Components */
import RangeSlider from '@components/RangeSlider';
/** Styles */
import './ProgressBar.scss';

interface ProgressBarProps {
  currentTime: number;
  duration: number | undefined;
  onUpdate: (e: ChangeEvent<HTMLInputElement>) => void;
}

const ProgressBar = ({ currentTime, duration, onUpdate }: ProgressBarProps) => {
  return (
    <RangeSlider
      min={0}
      max={duration}
      value={currentTime}
      step={0.1}
      onChange={onUpdate}
    />
  );
};

export default ProgressBar;
