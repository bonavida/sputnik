import Playlist from '@components/Playlist';
import { AudioProvider } from '@context/useAudio';

const App = () => {
  return (
    <AudioProvider>
      <main className="music-player">
        <Playlist />
      </main>
    </AudioProvider>
  );
};

export default App;
