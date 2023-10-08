import { createContext, useContext, useMemo, useState } from 'react';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface PlaylistContextProps {
  list: SongMetadata[];
  selectedIndex: number | undefined;
  nowPlaying: SongMetadata | undefined;
  nowPlayingIndex: number | undefined;
  setList: (list: SongMetadata[]) => void;
  setSelectedIndex: (index: number) => void;
  setNowPlaying: (song?: SongMetadata) => void;
  setNowPlayingIndex: (index?: number) => void;
}

interface PlaylistProviderProps {
  children: React.ReactNode;
}

const PlaylistContext = createContext<PlaylistContextProps>({
  list: [],
  selectedIndex: undefined,
  nowPlaying: undefined,
  nowPlayingIndex: undefined,
  setList: () => '',
  setSelectedIndex: () => '',
  setNowPlaying: () => '',
  setNowPlayingIndex: () => '',
});

// Export the provider as we need to wrap the entire app with it
export const PlaylistProvider = ({ children }: PlaylistProviderProps) => {
  const [list, setList] = useState<SongMetadata[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [nowPlaying, setNowPlaying] = useState<SongMetadata>();
  const [nowPlayingIndex, setNowPlayingIndex] = useState<number>();

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
      selectedIndex,
      nowPlaying,
      nowPlayingIndex,
      setList,
      setSelectedIndex,
      setNowPlaying,
      setNowPlayingIndex,
    }),
    [nowPlaying, nowPlayingIndex, list, selectedIndex]
  );

  return (
    <PlaylistContext.Provider value={memoedValue}>
      {children}
    </PlaylistContext.Provider>
  );
};

// Let's only export the `usePlaylist` hook instead of the context.
// We only want to use the hook directly and never the context component.
const usePlaylist = () => useContext(PlaylistContext);

export default usePlaylist;
