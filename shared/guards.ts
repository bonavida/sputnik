import type {
  DialogLabels,
  PersistedState,
  Playlist,
  Rgb,
  Scrobble,
  ScrobbleTrack,
  Session,
  Settings,
  ThemeSource,
  TitleBarColors,
  Track,
} from './types';

// Windows long paths go up to 32,767 characters
export const MAX_PATH_LENGTH = 32_767;
export const MAX_PATHS = 50_000;
export const MAX_TEXT_LENGTH = 1_024;
export const MAX_PLAYLISTS = 1_000;

const THEME_SOURCES: readonly ThemeSource[] = ['system', 'light', 'dark'];
const LOCALES: readonly Settings['locale'][] = ['system', 'es', 'en'];
const REPEAT_MODES: readonly Settings['repeat'][] = ['off', 'all', 'one'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isText = (
  value: unknown,
  maxLength = MAX_TEXT_LENGTH
): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength;

const isOptionalText = (value: unknown): value is string | undefined =>
  value === undefined || isText(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isPath = (value: unknown): value is string =>
  isText(value, MAX_PATH_LENGTH);

export const isPathList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= MAX_PATHS && value.every(isPath);

export const isDialogLabels = (value: unknown): value is DialogLabels =>
  isRecord(value) && isText(value.title) && isText(value.filterName);

export const isThemeSource = (value: unknown): value is ThemeSource =>
  THEME_SOURCES.includes(value as ThemeSource);

export const isTitleBarColors = (value: unknown): value is TitleBarColors =>
  isRecord(value) &&
  typeof value.background === 'string' &&
  HEX_COLOR.test(value.background) &&
  typeof value.symbol === 'string' &&
  HEX_COLOR.test(value.symbol);

const isChannel = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255;

const isRgb = (value: unknown): value is Rgb =>
  Array.isArray(value) && value.length === 3 && value.every(isChannel);

export const isTrack = (value: unknown): value is Track =>
  isRecord(value) &&
  isText(value.id) &&
  isPath(value.path) &&
  isText(value.title) &&
  isOptionalText(value.artist) &&
  isOptionalText(value.album) &&
  isFiniteNumber(value.duration) &&
  value.duration >= 0 &&
  isOptionalText(value.coverUrl) &&
  (value.color === undefined || isRgb(value.color));

export const isScrobbleTrack = (value: unknown): value is ScrobbleTrack =>
  isRecord(value) &&
  isText(value.artist) &&
  isText(value.title) &&
  isOptionalText(value.album) &&
  Number.isInteger(value.duration) &&
  (value.duration as number) >= 0;

export const isScrobble = (value: unknown): value is Scrobble =>
  isScrobbleTrack(value) &&
  Number.isInteger((value as Scrobble).timestamp) &&
  (value as Scrobble).timestamp > 0;

export const isTrackList = (value: unknown): value is Track[] =>
  Array.isArray(value) && value.length <= MAX_PATHS && value.every(isTrack);

const isPlaylist = (value: unknown): value is Playlist =>
  isRecord(value) &&
  isText(value.id) &&
  isText(value.name) &&
  isTrackList(value.tracks) &&
  isFiniteNumber(value.createdAt) &&
  isFiniteNumber(value.updatedAt);

const isSession = (value: unknown): value is Session =>
  isRecord(value) &&
  isTrackList(value.queue) &&
  (value.currentIndex === undefined ||
    (Number.isInteger(value.currentIndex) &&
      (value.currentIndex as number) >= 0)) &&
  (value.position === undefined ||
    (isFiniteNumber(value.position) && value.position >= 0)) &&
  (value.playlistId === undefined || isText(value.playlistId)) &&
  (value.playlistName === undefined || isText(value.playlistName));

export const isSettings = (value: unknown): value is Settings =>
  isRecord(value) &&
  isThemeSource(value.theme) &&
  typeof value.albumTint === 'boolean' &&
  LOCALES.includes(value.locale as Settings['locale']) &&
  isFiniteNumber(value.volume) &&
  value.volume >= 0 &&
  value.volume <= 1 &&
  typeof value.muted === 'boolean' &&
  typeof value.shuffle === 'boolean' &&
  REPEAT_MODES.includes(value.repeat as Settings['repeat']);

const PERSISTED_KEYS = new Set<string>(['playlists', 'session', 'settings']);

export const isPersistedPatch = (
  value: unknown
): value is Partial<PersistedState> =>
  isRecord(value) &&
  Object.keys(value).every((key) => PERSISTED_KEYS.has(key)) &&
  (value.playlists === undefined ||
    (Array.isArray(value.playlists) &&
      value.playlists.length <= MAX_PLAYLISTS &&
      value.playlists.every(isPlaylist))) &&
  (value.session === undefined || isSession(value.session)) &&
  (value.settings === undefined || isSettings(value.settings));
