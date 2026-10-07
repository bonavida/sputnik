import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC, mediaUrl } from '@shared/constants';
import type { Platform, SputnikApi } from '@shared/types';

/**
 * The only bridge between the renderer and the system. Keep it minimal: each
 * method maps to one validated IPC channel (see electron/ipc.ts).
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
};

contextBridge.exposeInMainWorld('sputnik', api);
