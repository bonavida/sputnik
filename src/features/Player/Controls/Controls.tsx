import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cx from 'classnames';
/** Components */
import Button from '@components/Button';
/** Context */
import useAudio from '@context/useAudio';
import useControls from '@context/useControls';
/** Styles */
import './Controls.scss';

const Controls = () => {
  const { isPlaying, togglePlay, next, previous } = useAudio();
  const { shuffle, repeat, toggleShuffle, toggleRepeat } = useControls();

  const shuffleClasses = cx({
    'controls__icon-wrapper': true,
    'controls__icon-wrapper--active': shuffle,
  });

  const repeatClasses = cx({
    'controls__icon-wrapper': true,
    'controls__icon-wrapper--active': repeat,
  });

  return (
    <div className="controls">
      <Button className={shuffleClasses} onClick={toggleShuffle}>
        <FontAwesomeIcon icon="shuffle" className="controls__icon" />
      </Button>
      <Button
        className="controls__icon-wrapper controls__prev"
        onClick={previous}
      >
        <FontAwesomeIcon icon="backward-step" className="controls__icon" />
      </Button>
      <Button
        className="controls__icon-wrapper controls__play"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <FontAwesomeIcon icon="pause" className="controls__icon" />
        ) : (
          <FontAwesomeIcon icon="play" className="controls__icon" />
        )}
      </Button>
      <Button className="controls__icon-wrapper controls__next" onClick={next}>
        <FontAwesomeIcon icon="forward-step" className="controls__icon" />
      </Button>
      <Button className={repeatClasses} onClick={toggleRepeat}>
        <FontAwesomeIcon icon="repeat" className="controls__icon" />
      </Button>
    </div>
  );
};

export default Controls;
