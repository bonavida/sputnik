const { ipcMain } = require('electron');
/** Utils */
const { parseMusicFile } = require('./utils/metadata');

/**
 * IPC API
 * This is where we use native/server-side platform APIs (like NodeJS modules)
 */
const init = () => {
  ipcMain.handle('app:parse-files', async (_, filePaths) => {
    // Get the metadata for all music files
    const results = await Promise.allSettled(
      filePaths.map((filePath) => parseMusicFile(filePath))
    );
    // Return only valid metadata
    return results.map(({ value }) => value).filter((value) => value);
  });
};

module.exports = {
  init,
};
