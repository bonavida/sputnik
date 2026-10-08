import { DEFAULT_SETTINGS } from '@shared/constants';
import type {
  AvailableUpdate,
  CoverColor,
  DialogLabels,
  ImportFailure,
  ImportFailureReason,
  LastfmConnectResult,
  LastfmStatus,
  PersistedState,
  Platform,
  PlaylistFileResult,
  Scrobble,
  ScrobbleTrack,
  SputnikApi,
  ThemeSource,
  TitleBarColors,
  Track,
  UpdateInstallResult,
  UpdateStatus,
} from '@shared/types';

/** What each path resolves to when imported */
export type MemoryFile = Track | ImportFailureReason;

interface MemoryBridgeOptions {
  files?: Record<string, MemoryFile>;
  /** Folder path → paths inside it */
  folders?: Record<string, string[]>;
  state?: Partial<PersistedState>;
  platform?: Platform;
  mediaUrl?: (trackId: string) => string;
  lastfm?: Partial<LastfmStatus>;
  updates?: Partial<MemoryBridge['updates']>;
  /** Cached cover file names and the color the current algorithm gives them */
  covers?: Record<string, CoverColor['color']>;
}

export interface MemoryBridge extends SputnikApi {
  /** Persisted state as the main process would store it */
  state: PersistedState;
  files: Record<string, MemoryFile>;
  /** What the next file/folder/playlist dialogs return (empty or undefined = canceled) */
  dialogs: { files: string[]; folder: string[]; playlist?: PlaylistFileResult };
  /** Last.fm as the main process would report it, and the outcome of the next connect */
  lastfm: LastfmStatus & {
    nextConnect: LastfmConnectResult;
    /** User name that connecting signs in as */
    connectAs: string;
  };
  covers: Record<string, CoverColor['color']>;
  /** Updates as the main process would report them; `latest` is what GitHub has */
  updates: UpdateStatus & {
    latest?: AvailableUpdate;
    isOffline: boolean;
    nextInstall: UpdateInstallResult;
    skippedVersion?: string;
  };
  calls: {
    updates: Array<'install' | 'download' | 'notes'>;
    shownInFolder: string[];
    coverColors: string[][];
    dialogLabels: DialogLabels[];
    exported: Array<{ name: string; tracks: Track[] }>;
    themes: Array<{ source: ThemeSource; titleBar: TitleBarColors }>;
    nowPlaying: ScrobbleTrack[];
    scrobbles: Scrobble[];
  };
}

const isTrack = (file: MemoryFile | undefined): file is Track =>
  typeof file === 'object';

/**
 * In-memory implementation of the preload API, with the same contract as
 * electron/ipc/handlers.ts. Used by the renderer tests and by the browser demo mode.
 */
export const createMemoryBridge = ({
  files = {},
  folders = {},
  state = {},
  platform = 'win32',
  mediaUrl = (trackId) => `memory://media/${trackId}`,
  lastfm = {},
  updates = {},
  covers = {},
}: MemoryBridgeOptions = {}): MemoryBridge => {
  const updateStatus = (): UpdateStatus => {
    const {
      currentVersion,
      checkAutomatically,
      isChecking,
      isInstalling,
      available,
    } = bridge.updates;
    return {
      currentVersion,
      checkAutomatically,
      isChecking,
      isInstalling,
      available,
    };
  };
  const expand = (path: string) => folders[path] ?? [path];
  const lastfmStatus = (): LastfmStatus => {
    const { isAvailable, user, isEnabled, pending } = bridge.lastfm;
    return { isAvailable, user, isEnabled, pending };
  };
  const isScrobbling = () =>
    Boolean(bridge.lastfm.user && bridge.lastfm.isEnabled);

  const bridge: MemoryBridge = {
    platform,
    state: {
      playlists: [],
      settings: DEFAULT_SETTINGS,
      ...structuredClone(state),
    },
    files,
    covers,
    dialogs: { files: [], folder: [] },
    lastfm: {
      isAvailable: true,
      isEnabled: true,
      pending: 0,
      nextConnect: 'connected',
      connectAs: 'sputnik-fan',
      ...lastfm,
    },
    updates: {
      currentVersion: '2.1.0',
      checkAutomatically: true,
      isChecking: false,
      isInstalling: false,
      isOffline: false,
      nextInstall: 'started',
      ...updates,
    },
    calls: {
      updates: [],
      shownInFolder: [],
      coverColors: [],
      dialogLabels: [],
      exported: [],
      themes: [],
      nowPlaying: [],
      scrobbles: [],
    },

    getPathForFile: (file) => file.name,
    mediaUrl,

    coverColors: async (fileNames) => {
      bridge.calls.coverColors.push([...fileNames]);
      return fileNames
        .filter((fileName) => fileName in bridge.covers)
        .map((fileName) => ({ fileName, color: bridge.covers[fileName] }));
    },

    showInFolder: async (trackId) => {
      const isImported = Object.values(bridge.files).some(
        (file) => isTrack(file) && file.id === trackId
      );
      if (isImported) bridge.calls.shownInFolder.push(trackId);
      return isImported;
    },

    importPaths: async (paths) => {
      const resolved = [...new Set(paths.flatMap(expand))];
      const failed: ImportFailure[] = resolved.flatMap((path) => {
        const file = bridge.files[path];
        if (isTrack(file)) return [];
        return [{ path, reason: file ?? 'missing' }];
      });
      const tracks = resolved.map((path) => bridge.files[path]).filter(isTrack);
      return { tracks: structuredClone(tracks), failed };
    },

    restoreTracks: async (paths) => ({
      missing: paths.filter((path) => !isTrack(bridge.files[path])),
    }),

    openFiles: async (labels) => {
      bridge.calls.dialogLabels.push(labels);
      return bridge.dialogs.files;
    },

    openFolder: async (labels) => {
      bridge.calls.dialogLabels.push(labels);
      return bridge.dialogs.folder;
    },

    exportPlaylist: async (name, tracks, labels) => {
      bridge.calls.dialogLabels.push(labels);
      bridge.calls.exported.push({ name, tracks: structuredClone(tracks) });
      return true;
    },

    importPlaylist: async (labels) => {
      bridge.calls.dialogLabels.push(labels);
      return (
        bridge.dialogs.playlist && structuredClone(bridge.dialogs.playlist)
      );
    },

    loadState: async () => structuredClone(bridge.state),

    saveState: async (patch) => {
      bridge.state = { ...bridge.state, ...structuredClone(patch) };
    },

    setTheme: async (source, titleBar) => {
      bridge.calls.themes.push({ source, titleBar });
    },

    lastfmStatus: async () => lastfmStatus(),

    lastfmConnect: async () => {
      const result = bridge.lastfm.nextConnect;
      if (result === 'connected')
        bridge.lastfm = {
          ...bridge.lastfm,
          user: bridge.lastfm.connectAs,
          isEnabled: true,
        };
      return result;
    },

    lastfmCancelConnect: async () => undefined,

    lastfmDisconnect: async () => {
      bridge.lastfm = { ...bridge.lastfm, user: undefined, pending: 0 };
      return lastfmStatus();
    },

    lastfmSetEnabled: async (isEnabled) => {
      bridge.lastfm = { ...bridge.lastfm, isEnabled };
      return lastfmStatus();
    },

    // Like the main process: ignored unless connected and enabled
    lastfmNowPlaying: async (track) => {
      if (isScrobbling()) bridge.calls.nowPlaying.push(structuredClone(track));
    },

    updatesStatus: async () => updateStatus(),

    updatesCheck: async () => {
      if (bridge.updates.isOffline) return 'failed';
      const { latest } = bridge.updates;
      bridge.updates = { ...bridge.updates, available: latest };
      return latest ? 'available' : 'up-to-date';
    },

    updatesInstall: async () => {
      bridge.calls.updates.push('install');
      return bridge.updates.nextInstall;
    },

    updatesOpenDownload: async () => {
      bridge.calls.updates.push('download');
    },

    updatesOpenNotes: async () => {
      bridge.calls.updates.push('notes');
    },

    updatesSkip: async () => {
      bridge.updates = {
        ...bridge.updates,
        skippedVersion: bridge.updates.available?.version,
        available: undefined,
      };
      return updateStatus();
    },

    updatesSetAutomatic: async (checkAutomatically) => {
      bridge.updates = { ...bridge.updates, checkAutomatically };
      return updateStatus();
    },

    lastfmScrobble: async (scrobble) => {
      if (isScrobbling())
        bridge.calls.scrobbles.push(structuredClone(scrobble));
    },
  };

  return bridge;
};
