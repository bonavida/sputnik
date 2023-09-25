import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  ChangeEvent,
} from 'react';
/** Context */
import usePlaylist from '@context/usePlaylist';
/** Constants */
import { SECS_BEFORE_PREVIOUS_SONG } from '@constants/audio';
/** Types */
import { SongMetadata } from '@customTypes/metadata';
import { AudioTimeUpdateEvent } from '@customTypes/events';

interface AudioContextProps {
  nowPlaying: SongMetadata | undefined;
  nowPlayingIndex: number | undefined;
  isPlaying: boolean;
  time: number;
  volume: number;
  isVolumeEnabled: boolean;
  setNowPlaying: (song: SongMetadata) => void;
  setNowPlayingIndex: (index: number) => void;
  updateCurrentTime: (e: ChangeEvent<HTMLInputElement>) => void;
  updateVolume: (e: ChangeEvent<HTMLInputElement>) => void;
  play: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleVolume: (isEnabled: boolean) => void;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioContext = createContext<AudioContextProps>({
  nowPlaying: undefined,
  nowPlayingIndex: undefined,
  isPlaying: false,
  time: 0,
  volume: 1,
  isVolumeEnabled: true,
  setNowPlaying: () => '',
  setNowPlayingIndex: () => '',
  updateCurrentTime: () => '',
  updateVolume: () => '',
  play: () => '',
  togglePlay: () => '',
  next: () => '',
  previous: () => '',
  toggleShuffle: () => '',
  toggleRepeat: () => '',
  toggleVolume: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const AudioProvider = ({ children }: AudioProviderProps) => {
  const { list } = usePlaylist();
  const [nowPlaying, setNowPlaying] = useState<SongMetadata>();
  const [nowPlayingIndex, setNowPlayingIndex] = useState<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVolumeEnabled, setIsVolumeEnabled] = useState(true);
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
      setTime(0);
      return;
    }
    // If not, play next song
    const nextIndex = nowPlayingIndex! + 1;
    setNowPlayingIndex(nextIndex);
    setNowPlaying(list[nextIndex]);
  };

  // We need to explicitely handle the isPlaying state
  // if the user plays the audio from the system media player
  const handlePlay = () => {
    if (!isPlaying) setIsPlaying(true);
  };

  // We need to explicitely handle the isPlaying state
  // if the user pauses the audio from the system media player
  const handlePause = () => {
    if (isPlaying) setIsPlaying(false);
  };

  const handleTimeUpdate = (e: AudioTimeUpdateEvent<HTMLAudioElement>) => {
    const { currentTime } = e.target;
    setTime(currentTime);
  };

  const updateCurrentTime = (e: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !nowPlaying) return;

    const { duration = 0 } = nowPlaying;
    const numberValue = +e.target.value;
    const currentTime = (duration / 100) * numberValue;

    audioRef.current.currentTime = currentTime;
    setTime(currentTime);
  };

  const updateVolume = (e: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const numberValue = +e.target.value;
    const currentVolume = numberValue / 100;

    audioRef.current.volume = currentVolume;
    setVolume(currentVolume);

    if (currentVolume && !isVolumeEnabled) setIsVolumeEnabled(true);
    if (!currentVolume) setIsVolumeEnabled(false);
  };

  const toggleVolume = (isEnabled = false) => {
    if (!audioRef.current) return;

    const restoredVolume = isEnabled ? 0 : volume;
    audioRef.current.volume = restoredVolume;

    setIsVolumeEnabled((prev) => !prev);
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
      time,
      volume,
      isVolumeEnabled,
      setNowPlaying,
      setNowPlayingIndex,
      updateCurrentTime,
      updateVolume,
      play,
      togglePlay,
      next,
      previous,
      toggleShuffle,
      toggleRepeat,
      toggleVolume,
    }),
    [nowPlaying, nowPlayingIndex, isPlaying, time, volume]
  );

  return (
    <AudioContext.Provider value={memoedValue}>
      {children}
      <audio
        ref={audioRef}
        src={nowPlaying?.path}
        onLoadedMetadata={() => play()}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        onPlay={handlePlay}
        onPause={handlePause}
      />
    </AudioContext.Provider>
  );
};

// Let's only export the `useAudio` hook instead of the context.
// We only want to use the hook directly and never the context component.
const useAudio = () => useContext(AudioContext);

export default useAudio;
