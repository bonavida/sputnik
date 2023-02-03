/** Features */
import Details from '@features/Details';
import Playlist from '@features/Playlist';
import Player from '@features/Player';
/** Context */
import { AudioProvider } from '@context/useAudio';

const App = () => {
  return (
    <AudioProvider>
      <main className="sputnik">
        <Details />
        <Playlist />
        <Player />
      </main>
    </AudioProvider>
  );
};

export default App;
