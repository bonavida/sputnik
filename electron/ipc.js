const { ipcMain } = require('electron');
/** Utils */
const { parseMusicFile } = require('./utils/metadata');

// This is where we use native/server-side platform APIs (like NodeJS modules)
// You must use the ipcRenderer in the preload JS file in order to use the ipc API
// Example: ipcRenderer.invoke('app:parse-files', arg);
const init = () => {
  ipcMain.handle('app:parse-files', async (_, filePaths) => {
    // Get the metadata for all music files
    const results = await Promise.allSettled(filePaths.map(parseMusicFile));
    // Return only valid metadata
    return results.map(({ value }) => value).filter((value) => value);
  });
};

module.exports = {
  init,
};
