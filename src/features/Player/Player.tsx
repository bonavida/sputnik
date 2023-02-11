/** Components */
import Controls from './Controls';
/** Styles */
import './Player.scss';
import ProgressBar from './ProgressBar/ProgressBar';

const Player = () => {
  return (
    <section className="player">
      <Controls />
      <ProgressBar />
    </section>
  );
};

export default Player;
