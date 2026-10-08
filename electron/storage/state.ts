import { DEFAULT_SETTINGS } from '@shared/constants';
import { isPersistedPatch, isRecord, isScrobble, isText } from '@shared/guards';
import type { PersistedState, Scrobble } from '@shared/types';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

/** Last.fm account and pending scrobbles, as written to disk */
export interface StoredLastfm {
  user?: string;
  /** Session key encrypted with the OS keychain (safeStorage), base64 */
  sessionKey?: string;
  isEnabled: boolean;
  queue: Scrobble[];
}

export interface StoredUpdates {
  checkAutomatically: boolean;
  skippedVersion?: string;
}

/** What `sputnik.json` holds: the renderer's state plus main-only data */
export interface StoredState extends PersistedState {
  windowBounds?: WindowBounds;
  lastfm?: StoredLastfm;
  updates?: StoredUpdates;
}

// Two weeks of nonstop listening is about 5,000 songs; Last.fm drops older ones
const MAX_PENDING_SCROBBLES = 10_000;

export const DEFAULT_STATE: StoredState = {
  playlists: [],
  settings: DEFAULT_SETTINGS,
};

const isWindowBounds = (value: unknown): value is WindowBounds =>
  isRecord(value) &&
  ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) &&
  typeof value.isMaximized === 'boolean';

const isStoredLastfm = (value: unknown): value is StoredLastfm =>
  isRecord(value) &&
  (value.user === undefined || isText(value.user)) &&
  (value.sessionKey === undefined || isText(value.sessionKey)) &&
  typeof value.isEnabled === 'boolean' &&
  Array.isArray(value.queue) &&
  value.queue.length <= MAX_PENDING_SCROBBLES &&
  value.queue.every(isScrobble);

const isStoredUpdates = (value: unknown): value is StoredUpdates =>
  isRecord(value) &&
  typeof value.checkAutomatically === 'boolean' &&
  (value.skippedVersion === undefined || isText(value.skippedVersion));

/**
 * Validates the stored JSON. Missing keys and settings added in newer versions
 * fall back to their defaults, so old files keep working.
 */
export const parseStoredState = (value: unknown): StoredState | undefined => {
  if (!isRecord(value)) return undefined;

  const { windowBounds, lastfm, updates, playlists, session, settings } = value;
  const state = {
    playlists: playlists ?? DEFAULT_STATE.playlists,
    session,
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(settings) ? settings : {}) },
  };
  if (!isPersistedPatch(state)) return undefined;

  return {
    playlists: state.playlists ?? DEFAULT_STATE.playlists,
    session: state.session,
    settings: state.settings ?? DEFAULT_SETTINGS,
    windowBounds: isWindowBounds(windowBounds) ? windowBounds : undefined,
    // An invalid Last.fm entry only costs a reconnection, never the playlists
    lastfm: isStoredLastfm(lastfm) ? lastfm : undefined,
    updates: isStoredUpdates(updates) ? updates : undefined,
  };
};

export const toPersistedState = ({
  playlists,
  session,
  settings,
}: StoredState): PersistedState => ({
  playlists,
  session,
  settings,
});
