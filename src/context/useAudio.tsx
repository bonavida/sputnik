import { createContext, useContext, useMemo, useState, useRef } from 'react';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface AudioContextProps {
  list: SongMetadata[];
  nowPlaying: SongMetadata | undefined;
  nowPlayingIndex: number | undefined;
  volume: number;
  setList: (list: SongMetadata[]) => void;
  setNowPlaying: (song: SongMetadata) => void;
  setNowPlayingIndex: (index: number) => void;
  setVolume: (value: number) => void;
  play: () => void;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioContext = createContext<AudioContextProps>({
  list: [],
  nowPlaying: undefined,
  nowPlayingIndex: undefined,
  volume: 100,
  setList: () => '',
  setNowPlaying: () => '',
  setNowPlayingIndex: () => '',
  setVolume: () => '',
  play: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const AudioProvider = ({ children }: AudioProviderProps) => {
  const [list, setList] = useState<SongMetadata[]>([]);
  const [nowPlaying, setNowPlaying] = useState<SongMetadata>();
  const [nowPlayingIndex, setNowPlayingIndex] = useState<number>();
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = () => {
    if (!audioRef.current) return;
    audioRef.current.play();
  };

  const handleSongEnd = () => {
    // If end of playlist has been reached, stop playing and reset now playing state
    if (nowPlayingIndex === list.length - 1) {
      setNowPlayingIndex(undefined);
      setNowPlaying(undefined);
      return;
    }
    // If not, play next song
    const nextIndex = nowPlayingIndex! + 1;
    setNowPlayingIndex(nextIndex);
    setNowPlaying(list[nextIndex]);
  };

  // Make the provider update only when it should.
  // We only want to force re-renders if the user,
  // loading or error states change.
  //
  // Whenever the `value` passed into a provider changes,
  // the whole tree under the provider re-renders, and
  // that can be very costly! Even in this case, where
  // you only get re-renders when logging in and out
  // we want to keep things very performant.
  const memoedValue = useMemo(
    () => ({
      list,
      nowPlaying,
      nowPlayingIndex,
      volume,
      setList,
      setNowPlaying,
      setNowPlayingIndex,
      setVolume,
      play,
    }),
    [list, nowPlaying, nowPlayingIndex, volume]
  );

  return (
    <AudioContext.Provider value={memoedValue}>
      {children}
      <audio
        ref={audioRef}
        src={nowPlaying?.path}
        onLoadedMetadata={() => play()}
        onEnded={handleSongEnd}
      />
    </AudioContext.Provider>
  );
};

// Let's only export the `useAudio` hook instead of the context.
// We only want to use the hook directly and never the context component.
const useAudio = () => useContext(AudioContext);

export default useAudio;
