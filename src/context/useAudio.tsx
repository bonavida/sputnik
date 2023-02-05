import { createContext, useContext, useMemo, useState, useRef } from 'react';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface AudioContextProps {
  nowPlaying: SongMetadata | undefined;
  nowPlayingIndex: number | undefined;
  volume: number;
  play: () => void;
  changeNowPlaying: (song: SongMetadata) => void;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioContext = createContext<AudioContextProps>({
  nowPlaying: undefined,
  nowPlayingIndex: undefined,
  volume: 100,
  play: () => '',
  changeNowPlaying: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const AudioProvider = ({ children }: AudioProviderProps) => {
  const [nowPlaying, setNowPlaying] = useState<SongMetadata>();
  const [nowPlayingIndex, setNowPlayingIndex] = useState<number>();
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = () => {
    if (!audioRef.current) return;
    audioRef.current.play();
  };

  const changeNowPlaying = (song: SongMetadata) => {
    setNowPlaying(song);
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
      nowPlaying,
      nowPlayingIndex,
      volume,
      play,
      changeNowPlaying,
    }),
    [nowPlaying, nowPlayingIndex, volume]
  );

  // We only want to render the underlying app after we
  // assert for the presence of a current user.
  return (
    <AudioContext.Provider value={memoedValue}>
      {children}
      <audio
        ref={audioRef}
        src={nowPlaying?.path}
        onLoadedMetadata={() => play()} // TODO: Remove this
      />
    </AudioContext.Provider>
  );
};

// Let's only export the `useAudio` hook instead of the context.
// We only want to use the hook directly and never the context component.
const useAudio = () => useContext(AudioContext);

export default useAudio;
