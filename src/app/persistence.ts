import type { PersistedState, Session, Settings } from '@shared/types';
import { bridge } from '@/bridge/bridge';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useSettingsStore } from '@/stores/settingsStore';

// The position changes four times a second, too often to rewrite the state file:
// it is saved when it matters (pause, seek, closing the window) and every few
// seconds while playing, in case the app does not close cleanly
const POSITION_SAVE_INTERVAL_S = 10;

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
  const { queue, position } = usePlayerStore.getState();
  const { currentId, name } = usePlaylistsStore.getState();
  const currentIndex = queue.entries.findIndex(
    ({ uid }) => uid === queue.currentUid
  );
  const hasCurrent = currentIndex !== -1;
  return {
    queue: queue.entries.map(({ track }) => track),
    currentIndex: hasCurrent ? currentIndex : undefined,
    position: hasCurrent ? position : undefined,
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
  let savedPosition = usePlayerStore.getState().position;
  const saveSession = () => {
    savedPosition = usePlayerStore.getState().position;
    save({ session: sessionSnapshot() });
  };
  // Not pagehide: Electron drops IPC sent while the page unloads, but a message
  // sent from beforeunload reaches the main process before it flushes and quits
  window.addEventListener('beforeunload', saveSession);

  const unsubscribers = [
    () => window.removeEventListener('beforeunload', saveSession),
    usePlayerStore.subscribe((state, previous) => {
      if (
        state.queue.entries !== previous.queue.entries ||
        state.queue.currentUid !== previous.queue.currentUid ||
        state.status !== previous.status ||
        state.seekRequest !== previous.seekRequest ||
        Math.abs(state.position - savedPosition) >= POSITION_SAVE_INTERVAL_S
      ) {
        saveSession();
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
        saveSession();
      }
    }),
    useSettingsStore.subscribe(() => save({ settings: settingsSnapshot() })),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};
