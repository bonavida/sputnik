import { DEFAULT_SETTINGS } from '@shared/constants';
import type {
  DialogLabels,
  ImportFailure,
  ImportFailureReason,
  PersistedState,
  Platform,
  PlaylistFileResult,
  SputnikApi,
  ThemeSource,
  TitleBarColors,
  Track,
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
}

export interface MemoryBridge extends SputnikApi {
  /** Persisted state as the main process would store it */
  state: PersistedState;
  files: Record<string, MemoryFile>;
  /** What the next file/folder/playlist dialogs return (empty or undefined = canceled) */
  dialogs: { files: string[]; folder: string[]; playlist?: PlaylistFileResult };
  calls: {
    dialogLabels: DialogLabels[];
    exported: Array<{ name: string; tracks: Track[] }>;
    themes: Array<{ source: ThemeSource; titleBar: TitleBarColors }>;
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
}: MemoryBridgeOptions = {}): MemoryBridge => {
  const expand = (path: string) => folders[path] ?? [path];

  const bridge: MemoryBridge = {
    platform,
    state: {
      playlists: [],
      settings: DEFAULT_SETTINGS,
      ...structuredClone(state),
    },
    files,
    dialogs: { files: [], folder: [] },
    calls: { dialogLabels: [], exported: [], themes: [] },

    getPathForFile: (file) => file.name,
    mediaUrl,

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
  };

  return bridge;
};
