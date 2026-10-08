import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC, mediaUrl } from '@shared/constants';
import type { Platform, SputnikApi } from '@shared/types';

/**
 * The only bridge between the renderer and the system. Keep it minimal: each
 * method maps to one validated IPC channel (see electron/ipc/handlers.ts).
 */
const api: SputnikApi = {
  platform: process.platform as Platform,
  getPathForFile: (file) => webUtils.getPathForFile(file),
  importPaths: (paths) => ipcRenderer.invoke(IPC.importPaths, paths),
  restoreTracks: (paths) => ipcRenderer.invoke(IPC.restoreTracks, paths),
  mediaUrl,
  openFiles: (labels) => ipcRenderer.invoke(IPC.openFiles, labels),
  openFolder: (labels) => ipcRenderer.invoke(IPC.openFolder, labels),
  exportPlaylist: (name, tracks, labels) =>
    ipcRenderer.invoke(IPC.exportPlaylist, name, tracks, labels),
  importPlaylist: (labels) => ipcRenderer.invoke(IPC.importPlaylist, labels),
  loadState: () => ipcRenderer.invoke(IPC.loadState),
  saveState: (patch) => ipcRenderer.invoke(IPC.saveState, patch),
  setTheme: (source, titleBar) =>
    ipcRenderer.invoke(IPC.setTheme, source, titleBar),
  lastfmStatus: () => ipcRenderer.invoke(IPC.lastfmStatus),
  lastfmConnect: () => ipcRenderer.invoke(IPC.lastfmConnect),
  lastfmCancelConnect: () => ipcRenderer.invoke(IPC.lastfmCancelConnect),
  lastfmDisconnect: () => ipcRenderer.invoke(IPC.lastfmDisconnect),
  lastfmSetEnabled: (isEnabled) =>
    ipcRenderer.invoke(IPC.lastfmSetEnabled, isEnabled),
  lastfmNowPlaying: (track) => ipcRenderer.invoke(IPC.lastfmNowPlaying, track),
  lastfmScrobble: (scrobble) =>
    ipcRenderer.invoke(IPC.lastfmScrobble, scrobble),
  updatesStatus: () => ipcRenderer.invoke(IPC.updatesStatus),
  updatesCheck: () => ipcRenderer.invoke(IPC.updatesCheck),
  updatesInstall: () => ipcRenderer.invoke(IPC.updatesInstall),
  updatesOpenDownload: () => ipcRenderer.invoke(IPC.updatesOpenDownload),
  updatesOpenNotes: () => ipcRenderer.invoke(IPC.updatesOpenNotes),
  updatesSkip: () => ipcRenderer.invoke(IPC.updatesSkip),
  updatesSetAutomatic: (isEnabled) =>
    ipcRenderer.invoke(IPC.updatesSetAutomatic, isEnabled),
};

contextBridge.exposeInMainWorld('sputnik', api);
