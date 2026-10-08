/**
 * User flows that span several stores and the bridge. Components and keyboard
 * shortcuts call these instead of orchestrating stores themselves.
 */
import type { DialogLabels, Playlist, Track } from '@shared/types';
import type { TranslationKey } from '@/i18n/t';
import { bridge } from '@/bridge/bridge';
import { usePlayerStore } from '@/stores/playerStore';
import { hasUnsavedChanges, usePlaylistsStore } from '@/stores/playlistsStore';
import { getTranslate, useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { compareTracks, nextSortOrder, sortOrderOf } from '@/utils/trackSort';
import type { SortKey } from '@/utils/trackSort';

const labels = (
  title: TranslationKey,
  filterName: TranslationKey
): DialogLabels => {
  const t = getTranslate();
  return { title: t(title), filterName: t(filterName) };
};

export const queuedTracks = (): Track[] =>
  usePlayerStore.getState().queue.entries.map(({ track }) => track);

const currentName = () =>
  usePlaylistsStore.getState().name ?? getTranslate()('untitled');

/** Loads tracks into the queue, marking the ones whose files are gone */
const loadIntoQueue = async (tracks: Track[], currentIndex?: number) => {
  const { missing } = await bridge().restoreTracks(
    tracks.map(({ path }) => path)
  );
  const player = usePlayerStore.getState();
  player.replaceQueue(tracks, currentIndex);
  const missingPaths = new Set(missing);
  player.markUnplayable(
    tracks.filter(({ path }) => missingPaths.has(path)).map(({ id }) => id)
  );
  if (missing.length > 0)
    useUiStore.getState().showNotice({ kind: 'missingTracks', paths: missing });
};

export const importPaths = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  const ui = useUiStore.getState();
  ui.setImporting(true);
  try {
    const { tracks, failed } = await bridge().importPaths(paths);
    usePlayerStore.getState().addTracks(tracks);
    if (failed.length > 0)
      ui.showNotice({ kind: 'failedFiles', failures: failed });
  } catch {
    ui.showNotice({
      kind: 'failedFiles',
      failures: paths.map((path) => ({ path, reason: 'unreadable' })),
    });
  } finally {
    ui.setImporting(false);
  }
};

export const addSongs = async (): Promise<void> =>
  importPaths(await bridge().openFiles(labels('addSongs', 'audioFiles')));

export const addFolder = async (): Promise<void> =>
  importPaths(await bridge().openFolder(labels('addFolder', 'audioFiles')));

/** Sorts the list by a column: ascending first, then toggling */
export const sortQueue = (key: SortKey, locale: string): void => {
  const player = usePlayerStore.getState();
  const tracks = player.queue.entries.map(({ track }) => track);
  const compare = compareTracks(
    nextSortOrder(key, sortOrderOf(tracks, locale)),
    locale
  );
  player.sort((a, b) => compare(a.track, b.track));
};

/** Opens the song's folder in the file manager, with the file selected */
export const showInFolder = (uid?: string): void => {
  const { queue, selectedUid } = usePlayerStore.getState();
  const target = uid ?? selectedUid;
  const track = queue.entries.find((entry) => entry.uid === target)?.track;
  if (track) void bridge().showInFolder(track.id);
};

export const savePlaylist = (): void =>
  usePlaylistsStore.getState().save(queuedTracks(), getTranslate()('untitled'));

export const savePlaylistCopy = (): void =>
  usePlaylistsStore
    .getState()
    .saveCopy(
      queuedTracks(),
      getTranslate()('copyOf', { name: currentName() })
    );

/** Runs `action` right away, or after confirming when there are unsaved changes */
export const confirmDiscard = (action: () => void): void => {
  if (!hasUnsavedChanges(usePlaylistsStore.getState(), queuedTracks()))
    return action();
  const t = getTranslate();
  useUiStore.getState().requestConfirmation({
    title: t('discardTitle'),
    body: t('discardBody', { name: currentName() }),
    confirmLabel: t('discard'),
    onConfirm: action,
  });
};

export const openPlaylist = async (playlist: Playlist): Promise<void> => {
  await loadIntoQueue(playlist.tracks);
  usePlaylistsStore.getState().setCurrent(playlist);
};

export const newPlaylist = (): void => {
  usePlayerStore.getState().replaceQueue([]);
  usePlaylistsStore.getState().setCurrent(undefined);
};

export const deletePlaylist = (playlist: Playlist): void => {
  const t = getTranslate();
  useUiStore.getState().requestConfirmation({
    title: t('deleteTitle', { name: playlist.name }),
    body: t('deleteBody'),
    confirmLabel: t('delete'),
    onConfirm: () => usePlaylistsStore.getState().deletePlaylist(playlist.id),
  });
};

export const exportPlaylist = async (): Promise<void> => {
  const isExported = await bridge().exportPlaylist(
    currentName(),
    queuedTracks(),
    labels('exportPlaylist', 'm3uFiles')
  );
  if (isExported) useUiStore.getState().showNotice({ kind: 'exported' });
};

export const importPlaylistFile = async (): Promise<void> => {
  const result = await bridge().importPlaylist(
    labels('importPlaylist', 'm3uFiles')
  );
  if (!result) return;
  usePlayerStore.getState().replaceQueue(result.tracks);
  usePlaylistsStore.getState().setCurrent(undefined, result.name);
  if (result.failed.length > 0)
    useUiStore
      .getState()
      .showNotice({ kind: 'failedFiles', failures: result.failed });
};

/** Startup: settings, saved playlists and the last session's queue */
export const restoreState = async (): Promise<void> => {
  const { settings, playlists, session } = await bridge().loadState();
  const { theme, albumTint, locale, volume, muted, shuffle, repeat } = settings;

  useSettingsStore.setState({ theme, albumTint, locale });
  usePlayerStore
    .getState()
    .setPlaybackOptions({ volume, muted, shuffle, repeat });
  usePlaylistsStore.setState({ playlists });

  if (!session) return;
  await loadIntoQueue(session.queue, session.currentIndex);
  if (session.position) usePlayerStore.getState().seek(session.position);
  const saved = playlists.find(({ id }) => id === session.playlistId);
  usePlaylistsStore.getState().setCurrent(saved, session.playlistName);
};
