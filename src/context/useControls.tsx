import { createContext, useContext, useMemo, useState, useEffect } from 'react';
/** Context */
import usePlaylist from '@context/usePlaylist';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface ControlsContextProps {
  shuffle: boolean;
  repeat: boolean;
  shuffledList: SongMetadata[];
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  play: (index: number) => void;
  remove: (index: number) => void;
}

interface ControlsProviderProps {
  children: React.ReactNode;
}

const ControlsContext = createContext<ControlsContextProps>({
  shuffle: false,
  repeat: false,
  shuffledList: [],
  toggleShuffle: () => '',
  toggleRepeat: () => '',
  play: () => '',
  remove: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const ControlsProvider = ({ children }: ControlsProviderProps) => {
  const {
    list,
    nowPlaying,
    nowPlayingIndex = 0,
    setList,
    setNowPlaying,
    setNowPlayingIndex,
  } = usePlaylist();
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [shuffledList, setShuffledList] = useState<SongMetadata[]>([]);

  useEffect(() => {
    if (shuffle) {
      // If we're shuffling, we need to create a new shuffled list
      const shuffled = list.filter((song) => song.id !== nowPlaying?.id);
      shuffled.sort(() => Math.random() - 0.5);
      shuffled.unshift(nowPlaying!); // Add the now playing song to the beginning of the array
      setShuffledList(shuffled);
      setNowPlayingIndex(0);
      return;
    }

    // If we're not shuffling, we need to reset the necessary state
    const index = list.findIndex((song) => song.id === nowPlaying?.id);
    setNowPlayingIndex(index);
    setShuffle(false);
    setShuffledList([]);
  }, [shuffle]);

  useEffect(() => {
    if (!shuffle) return;
    // Get the songs that have already been played and the ones that haven't
    const playedsongs = shuffledList.slice(0, nowPlayingIndex + 1);
    const unplayedSongs = shuffledList.slice(nowPlayingIndex + 1);
    // Get the new added songs
    const newSongs = list.filter(
      (song) => !shuffledList.find(({ id }) => id === song.id)
    );
    // Add the new songs to the unplayed songs array
    const newUnplayedSongs = [...unplayedSongs, ...newSongs].sort(
      () => Math.random() - 0.5
    );
    // Update the shuffled list
    setShuffledList([...playedsongs, ...newUnplayedSongs]);
  }, [list.length]);

  const toggleShuffle = () => {
    setShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeat((prev) => !prev);
  };

  // Play a song from the playlist whenever the user clicks on it explicitely
  const play = (index: number) => {
    const songToPlay = list[index];
    const indexToPlay = shuffle ? 0 : index;
    setNowPlayingIndex(indexToPlay);
    setNowPlaying(songToPlay);

    if (shuffle) {
      const shuffled = list.filter((song) => song.id !== songToPlay?.id);
      shuffled.sort(() => Math.random() - 0.5);
      shuffled.unshift(songToPlay!);
      setShuffledList(shuffled);
    }
  };

  // Remove a song from the playlist whenever the user clicks on the delete button
  const remove = (index: number) => {
    const songToRemove = list[index];
    const indexToRemove = shuffle
      ? shuffledList.findIndex((song) => song.id === songToRemove?.id)
      : index;

    // Remove the song from the list and the shuffled list
    const newList = list.filter((song) => song.id !== songToRemove?.id);
    const newShuffledList = shuffledList.filter(
      (song) => song.id !== songToRemove?.id
    );
    setList(newList);
    setShuffledList(newShuffledList);

    // If the song to remove is the now playing song, reset the state
    if (indexToRemove === nowPlayingIndex) {
      setNowPlayingIndex(undefined);
      setNowPlaying(undefined);
    }

    // If the song to remove is before the now playing song, decrement the now playing index
    if (indexToRemove !== -1 && indexToRemove < nowPlayingIndex) {
      setNowPlayingIndex(nowPlayingIndex - 1);
    }
  };

  // Make the provider update only when it should.
  // Whenever the `value` passed into a provider changes, the whole tree under
  // the provider re-renders, and that can be very costly!
  const memoedValue = useMemo(
    () => ({
      shuffle,
      repeat,
      shuffledList,
      toggleShuffle,
      toggleRepeat,
      play,
      remove,
    }),
    [shuffle, repeat, shuffledList, list, nowPlaying, nowPlayingIndex]
  );

  return (
    <ControlsContext.Provider value={memoedValue}>
      {children}
    </ControlsContext.Provider>
  );
};

// Let's only export the `useControls` hook instead of the context.
// We only want to use the hook directly and never the context component.
const useControls = () => useContext(ControlsContext);

export default useControls;
