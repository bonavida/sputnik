import { ChangeEvent } from 'react';
/** Context */
import useAudio from '@context/useAudio';
/** Context */
import { formatTime } from '@utils/time';
/** Components */
import ProgressBar from './ProgressBar';
/** Styles */
import './Progress.scss';

const Player = () => {
  const { nowPlaying, time, updateCurrentTime } = useAudio();

  return (
    <section className="progress">
      <span className="timer">{formatTime(time)}</span>
      <ProgressBar
        currentTime={time}
        duration={nowPlaying?.duration}
        onUpdate={(e: ChangeEvent<HTMLInputElement>) => updateCurrentTime(e)}
      />
      <span className="timer timer--total">
        {formatTime(nowPlaying?.duration)}
      </span>
    </section>
  );
};

export default Player;
