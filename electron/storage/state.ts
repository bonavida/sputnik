import { DEFAULT_SETTINGS } from '@shared/constants';
import { isPersistedPatch, isRecord } from '@shared/guards';
import type { PersistedState } from '@shared/types';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

/** What `sputnik.json` holds: the renderer's state plus main-only data */
export interface StoredState extends PersistedState {
  windowBounds?: WindowBounds;
}

export const DEFAULT_STATE: StoredState = {
  playlists: [],
  settings: DEFAULT_SETTINGS,
};

const isWindowBounds = (value: unknown): value is WindowBounds =>
  isRecord(value) &&
  ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) &&
  typeof value.isMaximized === 'boolean';

/**
 * Validates the stored JSON. Missing keys and settings added in newer versions
 * fall back to their defaults, so old files keep working.
 */
export const parseStoredState = (value: unknown): StoredState | undefined => {
  if (!isRecord(value)) return undefined;

  const { windowBounds, playlists, session, settings } = value;
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
