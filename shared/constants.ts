import type { Settings } from './types';

export const APP_ID = 'org.bonavida.sputnik';
export const APP_SCHEME = 'sputnik';
/** Where releases are published (owner/name) */
export const GITHUB_REPO = 'bonavida/sputnik';

export const PROTOCOL_HOST = {
  app: 'app',
  media: 'media',
  cover: 'cover',
} as const;

export const APP_ORIGIN = `${APP_SCHEME}://${PROTOCOL_HOST.app}`;

export const mediaUrl = (trackId: string): string =>
  `${APP_SCHEME}://${PROTOCOL_HOST.media}/${trackId}`;

export const coverUrl = (fileName: string): string =>
  `${APP_SCHEME}://${PROTOCOL_HOST.cover}/${fileName}`;

export const IPC = {
  importPaths: 'library:import',
  restoreTracks: 'library:restore',
  showInFolder: 'library:show-in-folder',
  openFiles: 'dialog:open-files',
  openFolder: 'dialog:open-folder',
  exportPlaylist: 'playlist:export',
  importPlaylist: 'playlist:import',
  loadState: 'state:load',
  saveState: 'state:save',
  setTheme: 'window:set-theme',
  lastfmStatus: 'lastfm:status',
  lastfmConnect: 'lastfm:connect',
  lastfmCancelConnect: 'lastfm:cancel-connect',
  lastfmDisconnect: 'lastfm:disconnect',
  lastfmSetEnabled: 'lastfm:set-enabled',
  lastfmNowPlaying: 'lastfm:now-playing',
  lastfmScrobble: 'lastfm:scrobble',
  updatesStatus: 'updates:status',
  updatesCheck: 'updates:check',
  updatesInstall: 'updates:install',
  updatesOpenDownload: 'updates:open-download',
  updatesOpenNotes: 'updates:open-notes',
  updatesSkip: 'updates:skip',
  updatesSetAutomatic: 'updates:set-automatic',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  albumTint: true,
  locale: 'system',
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: 'off',
};
