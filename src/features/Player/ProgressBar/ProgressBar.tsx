import { useCallback, ChangeEvent } from 'react';
/** Components */
import RangeSlider from '@components/RangeSlider';
/** Context */
import useAudio from '@context/useAudio';
/** Styles */
import './ProgressBar.scss';
/** Types */

const ProgressBar = () => {
  const { nowPlaying, time, updateCurrentTime } = useAudio();

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateCurrentTime(e);
    },
    [updateCurrentTime]
  );

  return (
    <RangeSlider
      min={0}
      max={nowPlaying?.duration}
      value={time}
      step={0.1}
      onChange={handleChange}
    />
  );
};

export default ProgressBar;
