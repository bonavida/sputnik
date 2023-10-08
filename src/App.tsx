/** Features */
import Details from '@features/Details';
import Playlist from '@features/Playlist';
import Player from '@features/Player';
/** Context */
import { PlaylistProvider } from '@context/usePlaylist';
import { ControlsProvider } from '@context/useControls';
import { AudioProvider } from '@context/useAudio';

const App = () => {
  return (
    <PlaylistProvider>
      <ControlsProvider>
        <AudioProvider>
          <main className="sputnik">
            <Details />
            <Playlist />
            <Player />
          </main>
        </AudioProvider>
      </ControlsProvider>
    </PlaylistProvider>
  );
};

export default App;
