const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  parseMusicFiles: async (filePaths) =>
    ipcRenderer.invoke('app:parse-files', filePaths),
});
