const fs = require('fs').promises;

const readFiles = async (filePaths) => {
  try {
    const results = await Promise.allSettled(
      filePaths.map((filePath) => fs.readFile(filePath))
    );
    return results;
  } catch (e) {
    console.error(e);
    return [];
  }
};

module.exports = {
  readFiles,
};
