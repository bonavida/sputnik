/** Components */
import Controls from './Controls';
import Progress from './Progress';
/** Styles */
import './Player.scss';

const Player = () => {
  return (
    <section className="player">
      <Controls />
      <Progress />
    </section>
  );
};

export default Player;
