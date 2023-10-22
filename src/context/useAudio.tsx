import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  useEffect,
  ChangeEvent,
} from 'react';
/** Context */
import usePlaylist from '@context/usePlaylist';
import useControls from '@context/useControls';
/** Constants */
import { SECS_BEFORE_PREVIOUS_SONG } from '@constants/audio';
/** Types */
import { AudioTimeUpdateEvent } from '@customTypes/events';

interface AudioContextProps {
  isPlaying: boolean;
  time: number;
  volume: number;
  isVolumeEnabled: boolean;
  updateCurrentTime: (e: ChangeEvent<HTMLInputElement>) => void;
  updateVolume: (e: ChangeEvent<HTMLInputElement>) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  toggleVolume: (isEnabled: boolean) => void;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioContext = createContext<AudioContextProps>({
  isPlaying: false,
  time: 0,
  volume: 1,
  isVolumeEnabled: true,
  updateCurrentTime: () => '',
  updateVolume: () => '',
  togglePlay: () => '',
  next: () => '',
  previous: () => '',
  toggleVolume: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const AudioProvider = ({ children }: AudioProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVolumeEnabled, setIsVolumeEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    list,
    nowPlaying,
    nowPlayingIndex,
    setNowPlaying,
    setNowPlayingIndex,
  } = usePlaylist();
  const { shuffle, repeat, shuffledList } = useControls();

  useEffect(() => {
    if (!audioRef.current || nowPlaying) return;

    // Reset audio state if there's no song playing
    audioRef.current.src = '';
    setIsPlaying(false);
    setTime(0);
  }, [nowPlaying]);

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
    // If end of playlist has been reached and repeat is not active, do nothing
    if (nowPlayingIndex === list.length - 1 && !repeat) {
      if (!audioRef.current) return;
      setNowPlayingIndex(undefined);
      setNowPlaying(undefined);
      setIsPlaying(false);
      setTime(0);
      audioRef.current.src = '';
      return;
    }

    // If not, play next song
    const nextIndex =
      nowPlayingIndex === list.length - 1 && repeat ? 0 : nowPlayingIndex! + 1;
    const currentPlaylist = shuffle ? shuffledList : list;
    setNowPlayingIndex(nextIndex);
    setNowPlaying(currentPlaylist[nextIndex]);
  };

  const previous = () => {
    if (!audioRef.current) return;
    const { currentTime = 0 } = audioRef.current;
    // If song has been played more than 3 seconds, start the song over again
    // Do the same if repeat is not active and the beginning of the playlist has been reached
    if (
      currentTime >= SECS_BEFORE_PREVIOUS_SONG ||
      (nowPlayingIndex === 0 && !repeat)
    ) {
      audioRef.current.currentTime = 0;
      return;
    }

    // If not, play previous song
    const previousIndex =
      nowPlayingIndex === 0 && repeat ? list.length - 1 : nowPlayingIndex! - 1;
    const currentPlaylist = shuffle ? shuffledList : list;
    setNowPlayingIndex(previousIndex);
    setNowPlaying(currentPlaylist[previousIndex]);
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
  // Whenever the `value` passed into a provider changes, the whole tree under
  // the provider re-renders, and that can be very costly
  const memoedValue = useMemo(
    () => ({
      isPlaying,
      time,
      volume,
      isVolumeEnabled,
      updateCurrentTime,
      updateVolume,
      togglePlay,
      next,
      previous,
      toggleVolume,
    }),
    [
      nowPlaying,
      nowPlayingIndex,
      isPlaying,
      time,
      volume,
      isVolumeEnabled,
      list,
    ]
  );

  return (
    <AudioContext.Provider value={memoedValue}>
      {children}
      <audio
        ref={audioRef}
        src={nowPlaying?.path}
        onLoadedMetadata={() => play()}
        onTimeUpdate={handleTimeUpdate}
        onEnded={next}
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
