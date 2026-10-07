import type { PersistedState, Session, Settings } from '@shared/types';
import { bridge } from '@/lib/bridge';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useSettingsStore } from '@/stores/settingsStore';

const settingsSnapshot = (): Settings => {
  const { theme, albumTint, locale } = useSettingsStore.getState();
  const { volume, muted, queue } = usePlayerStore.getState();
  return {
    theme,
    albumTint,
    locale,
    volume,
    muted,
    shuffle: queue.shuffle,
    repeat: queue.repeat,
  };
};

const sessionSnapshot = (): Session => {
  const { queue } = usePlayerStore.getState();
  const { currentId, name } = usePlaylistsStore.getState();
  const currentIndex = queue.entries.findIndex(
    ({ uid }) => uid === queue.currentUid
  );
  return {
    queue: queue.entries.map(({ track }) => track),
    currentIndex: currentIndex === -1 ? undefined : currentIndex,
    playlistId: currentId,
    playlistName: name,
  };
};

const save = (patch: Partial<PersistedState>) => void bridge().saveState(patch);

/**
 * Saves each slice of state when it changes. The main process debounces the
 * disk writes, so frequent changes (like dragging the volume) are cheap.
 * Returns a function that stops saving.
 */
export const startPersistence = (): (() => void) => {
  const unsubscribers = [
    usePlayerStore.subscribe((state, previous) => {
      if (
        state.queue.entries !== previous.queue.entries ||
        state.queue.currentUid !== previous.queue.currentUid
      ) {
        save({ session: sessionSnapshot() });
      }
      if (
        state.volume !== previous.volume ||
        state.muted !== previous.muted ||
        state.queue.shuffle !== previous.queue.shuffle ||
        state.queue.repeat !== previous.queue.repeat
      ) {
        save({ settings: settingsSnapshot() });
      }
    }),
    usePlaylistsStore.subscribe((state, previous) => {
      if (state.playlists !== previous.playlists)
        save({ playlists: state.playlists });
      if (
        state.currentId !== previous.currentId ||
        state.name !== previous.name
      ) {
        save({ session: sessionSnapshot() });
      }
    }),
    useSettingsStore.subscribe(() => save({ settings: settingsSnapshot() })),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};
