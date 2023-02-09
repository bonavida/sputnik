import useAudio from '@context/useAudio';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
/** Styles */
import './Controls.scss';

const Controls = () => {
  const { isPlaying, togglePlay, next, previous, toggleShuffle, toggleRepeat } =
    useAudio();
  return (
    <div className="controls">
      <button
        type="button"
        className="controls__icon-wrapper controls__shuffle"
        onClick={toggleShuffle}
      >
        <FontAwesomeIcon icon="shuffle" className="controls__icon" />
      </button>
      <button
        type="button"
        className="controls__icon-wrapper controls__prev"
        onClick={previous}
      >
        <FontAwesomeIcon icon="backward-step" className="controls__icon" />
      </button>
      <button
        type="button"
        className="controls__icon-wrapper controls__play"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <FontAwesomeIcon icon="pause" className="controls__icon" />
        ) : (
          <FontAwesomeIcon icon="play" className="controls__icon" />
        )}
      </button>
      <button
        type="button"
        className="controls__icon-wrapper controls__next"
        onClick={next}
      >
        <FontAwesomeIcon icon="forward-step" className="controls__icon" />
      </button>
      <button
        type="button"
        className="controls__icon-wrapper controls__next"
        onClick={toggleRepeat}
      >
        <FontAwesomeIcon icon="repeat" className="controls__icon" />
      </button>
    </div>
  );
};

export default Controls;
