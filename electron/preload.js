const { contextBridge, ipcRenderer } = require('electron');

// ContextBridge is necessary to expose an API to the renderer processes
// Then, in the renderer it can be accessed through the window object
// Example: window.electronAPI.parseMusicFiles(...)
contextBridge.exposeInMainWorld('electronAPI', {
  parseMusicFiles: async (filePaths) =>
    ipcRenderer.invoke('app:parse-files', filePaths),
});
