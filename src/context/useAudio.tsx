import { createContext, useContext, useMemo, useState, useRef } from 'react';
/** Context */
import usePlaylist from '@context/usePlaylist';
/** Constants */
import { SECS_BEFORE_PREVIOUS_SONG } from '@constants/audio';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface AudioContextProps {
  nowPlaying: SongMetadata | undefined;
  nowPlayingIndex: number | undefined;
  isPlaying: boolean;
  volume: number;
  setNowPlaying: (song: SongMetadata) => void;
  setNowPlayingIndex: (index: number) => void;
  setVolume: (value: number) => void;
  play: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioContext = createContext<AudioContextProps>({
  nowPlaying: undefined,
  nowPlayingIndex: undefined,
  volume: 100,
  isPlaying: false,
  setNowPlaying: () => '',
  setNowPlayingIndex: () => '',
  setVolume: () => '',
  play: () => '',
  togglePlay: () => '',
  next: () => '',
  previous: () => '',
  toggleShuffle: () => '',
  toggleRepeat: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const AudioProvider = ({ children }: AudioProviderProps) => {
  const { list } = usePlaylist();
  const [nowPlaying, setNowPlaying] = useState<SongMetadata>();
  const [nowPlayingIndex, setNowPlayingIndex] = useState<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = () => {
    if (!audioRef.current || !nowPlaying) return;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !nowPlaying) return;
    if (isPlaying) {
      setIsPlaying(false);
      audioRef.current.pause();
      return;
    }
    play();
  };

  const next = () => {
    // If end of playlist has been reached, do nothing
    if (nowPlayingIndex === list.length - 1) {
      return;
    }
    // If not, play next song
    const nextIndex = nowPlayingIndex! + 1;
    setNowPlayingIndex(nextIndex);
    setNowPlaying(list[nextIndex]);
  };

  const previous = () => {
    if (!audioRef.current) return;
    const { currentTime = 0 } = audioRef.current;
    // If song has been played more than 3 seconds, start the song over again
    // Do the same when the beginning of playlist has been reached
    if (currentTime >= SECS_BEFORE_PREVIOUS_SONG || nowPlayingIndex === 0) {
      audioRef.current.currentTime = 0;
      return;
    }

    // If not, play previous song
    const previousIndex = nowPlayingIndex! - 1;
    setNowPlayingIndex(previousIndex);
    setNowPlaying(list[previousIndex]);
  };

  const toggleShuffle = () => {
    // TODO: Code me
  };

  const toggleRepeat = () => {
    // TODO: Code me
  };

  const handleSongEnd = () => {
    // If end of playlist has been reached, stop playing and reset now playing state
    if (nowPlayingIndex === list.length - 1) {
      setNowPlayingIndex(undefined);
      setNowPlaying(undefined);
      setIsPlaying(false);
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
      nowPlaying,
      nowPlayingIndex,
      isPlaying,
      volume,
      setNowPlaying,
      setNowPlayingIndex,
      setVolume,
      play,
      togglePlay,
      next,
      previous,
      toggleShuffle,
      toggleRepeat,
    }),
    [nowPlaying, nowPlayingIndex, isPlaying, volume]
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
