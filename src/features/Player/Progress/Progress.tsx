/** Context */
import useAudio from '@context/useAudio';
import usePlaylist from '@context/usePlaylist';
/** Utils */
import { formatTime } from '@utils/time';
/** Components */
import ProgressBar from './ProgressBar';
/** Styles */
import './Progress.scss';

const Player = () => {
  const { time, updateCurrentTime } = useAudio();
  const { nowPlaying } = usePlaylist();

  return (
    <section className="progress">
      <span className="timer">{formatTime(time)}</span>
      <ProgressBar
        currentTime={time}
        duration={nowPlaying?.duration}
        onUpdate={(e) => updateCurrentTime(e)}
      />
      <span className="timer timer--total">
        {formatTime(nowPlaying?.duration)}
      </span>
    </section>
  );
};

export default Player;
