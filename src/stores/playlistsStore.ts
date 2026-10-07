import { create } from 'zustand';
import type { Playlist, Track } from '@shared/types';

interface PlaylistsState {
  playlists: Playlist[];
  /** Saved playlist the queue was opened from or saved as */
  currentId?: string;
  /** Name of the list in the queue; undefined while untitled */
  name?: string;
}

interface PlaylistsActions {
  rename: (name: string) => void;
  /** Saves the queue into the current playlist, or as a new one */
  save: (tracks: Track[], fallbackName: string) => void;
  saveCopy: (tracks: Track[], name: string) => void;
  setCurrent: (
    playlist: Pick<Playlist, 'id' | 'name'> | undefined,
    name?: string
  ) => void;
  deletePlaylist: (id: string) => void;
}

const now = () => Date.now();

export const usePlaylistsStore = create<PlaylistsState & PlaylistsActions>()((
  set,
  get
) => {
  const upsert = (playlist: Playlist) =>
    set(({ playlists }) => ({
      playlists: playlists.some(({ id }) => id === playlist.id)
        ? playlists.map((existing) =>
            existing.id === playlist.id ? playlist : existing
          )
        : [...playlists, playlist],
    }));

  return {
    playlists: [],

    rename: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const { currentId, playlists } = get();
      set({ name: trimmed });
      // A saved playlist is renamed right away; renaming is not a pending change
      const saved = playlists.find(({ id }) => id === currentId);
      if (saved) upsert({ ...saved, name: trimmed, updatedAt: now() });
    },

    save: (tracks, fallbackName) => {
      const { currentId, playlists, name } = get();
      const saved = playlists.find(({ id }) => id === currentId);
      const playlistName = name ?? fallbackName;
      const playlist: Playlist = saved
        ? { ...saved, name: playlistName, tracks, updatedAt: now() }
        : {
            id: crypto.randomUUID(),
            name: playlistName,
            tracks,
            createdAt: now(),
            updatedAt: now(),
          };
      upsert(playlist);
      set({ currentId: playlist.id, name: playlistName });
    },

    saveCopy: (tracks, name) => {
      const playlist: Playlist = {
        id: crypto.randomUUID(),
        name,
        tracks,
        createdAt: now(),
        updatedAt: now(),
      };
      upsert(playlist);
      set({ currentId: playlist.id, name });
    },

    setCurrent: (playlist, name) =>
      set({ currentId: playlist?.id, name: playlist?.name ?? name }),

    deletePlaylist: (id) =>
      set(({ playlists, currentId }) => ({
        playlists: playlists.filter((playlist) => playlist.id !== id),
        // The queue stays, now as an unsaved list
        currentId: currentId === id ? undefined : currentId,
      })),
  };
});

const sameTracks = (first: Track[], second: Track[]) =>
  first.length === second.length &&
  first.every((track, index) => track.id === second[index]?.id);

/**
 * Unsaved changes are derived, not stored: the queue differs from the saved
 * playlist, or it is a new list with songs in it.
 */
export const hasUnsavedChanges = (
  { playlists, currentId }: Pick<PlaylistsState, 'playlists' | 'currentId'>,
  tracks: Track[]
): boolean => {
  const saved = playlists.find(({ id }) => id === currentId);
  return saved ? !sameTracks(saved.tracks, tracks) : tracks.length > 0;
};
