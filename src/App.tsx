/** Features */
import Details from '@features/Details';
import Playlist from '@features/Playlist';
import Player from '@features/Player';
/** Context */
import { PlaylistProvider } from '@context/usePlaylist';
import { AudioProvider } from '@context/useAudio';

const App = () => {
  return (
    <PlaylistProvider>
      <AudioProvider>
        <main className="sputnik">
          <Details />
          <Playlist />
          <Player />
        </main>
      </AudioProvider>
    </PlaylistProvider>
  );
};

export default App;
