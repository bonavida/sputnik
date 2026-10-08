/** sRGB color with 0–255 channels */
export type Rgb = readonly [number, number, number];

export interface Track {
  /** Opaque id derived from the path; the renderer never builds file URLs */
  id: string;
  /** Absolute path on disk */
  path: string;
  title: string;
  artist?: string;
  album?: string;
  /** Seconds, from metadata. The audio element refines it once loaded */
  duration: number;
  coverUrl?: string;
  /** Dominant cover color, used to tint the theme */
  color?: Rgb;
}

export type ImportFailureReason = 'unsupported' | 'unreadable' | 'missing';

export interface ImportFailure {
  path: string;
  reason: ImportFailureReason;
}

export interface ImportResult {
  tracks: Track[];
  failed: ImportFailure[];
}

export interface PlaylistFileResult extends ImportResult {
  name: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  queue: Track[];
  currentIndex?: number;
  /** Seconds into the current song */
  position?: number;
  /** Saved playlist the queue was opened from, if any */
  playlistId?: string;
  /** Undefined for a new, untitled list */
  playlistName?: string;
}

export type ThemeSource = 'system' | 'light' | 'dark';
export type LocaleSetting = 'system' | 'es' | 'en';
export type RepeatMode = 'off' | 'all' | 'one';

export interface Settings {
  theme: ThemeSource;
  albumTint: boolean;
  locale: LocaleSetting;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
}

export interface PersistedState {
  playlists: Playlist[];
  session?: Session;
  settings: Settings;
}

export interface DialogLabels {
  title: string;
  filterName: string;
}

export interface TitleBarColors {
  /** #rrggbb */
  background: string;
  /** #rrggbb */
  symbol: string;
}

export type Platform = 'win32' | 'darwin' | 'linux';

/** What Last.fm needs to know about a song: it cannot match one without an artist */
export interface ScrobbleTrack {
  artist: string;
  title: string;
  album?: string;
  /** Whole seconds */
  duration: number;
}

export interface Scrobble extends ScrobbleTrack {
  /** Unix time in seconds when the song started playing */
  timestamp: number;
}

export interface LastfmStatus {
  /** False when the build has no Last.fm API key: the feature is hidden */
  isAvailable: boolean;
  /** Last.fm user name once connected */
  user?: string;
  isEnabled: boolean;
  /** Scrobbles waiting to be sent (offline or Last.fm unavailable) */
  pending: number;
}

export type LastfmConnectResult =
  'connected' | 'cancelled' | 'timed-out' | 'failed';

/** API exposed by the preload script as `window.sputnik` */
export interface SputnikApi {
  platform: Platform;
  getPathForFile: (file: File) => string;
  importPaths: (paths: string[]) => Promise<ImportResult>;
  restoreTracks: (paths: string[]) => Promise<{ missing: string[] }>;
  /** URL the audio element loads a track from */
  mediaUrl: (trackId: string) => string;
  openFiles: (labels: DialogLabels) => Promise<string[]>;
  openFolder: (labels: DialogLabels) => Promise<string[]>;
  exportPlaylist: (
    name: string,
    tracks: Track[],
    labels: DialogLabels
  ) => Promise<boolean>;
  importPlaylist: (
    labels: DialogLabels
  ) => Promise<PlaylistFileResult | undefined>;
  loadState: () => Promise<PersistedState>;
  saveState: (patch: Partial<PersistedState>) => Promise<void>;
  setTheme: (source: ThemeSource, titleBar: TitleBarColors) => Promise<void>;
  lastfmStatus: () => Promise<LastfmStatus>;
  /** Opens Last.fm in the browser and resolves once the user approves (or not) */
  lastfmConnect: () => Promise<LastfmConnectResult>;
  lastfmCancelConnect: () => Promise<void>;
  lastfmDisconnect: () => Promise<LastfmStatus>;
  lastfmSetEnabled: (isEnabled: boolean) => Promise<LastfmStatus>;
  lastfmNowPlaying: (track: ScrobbleTrack) => Promise<void>;
  lastfmScrobble: (scrobble: Scrobble) => Promise<void>;
}
