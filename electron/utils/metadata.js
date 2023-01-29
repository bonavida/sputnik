const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mm = require('music-metadata');

const UNKNOWN = 'Unknown';

const parseMusicFile = async (filePath) => {
  try {
    const fileName = path.parse(filePath)?.name;
    const metadata = await mm.parseFile(filePath);
    const {
      common: { title, artist, albumartist, album, picture },
      format,
    } = metadata ?? {};
    return {
      id: uuidv4(),
      title: title ?? fileName,
      artist: artist ?? albumartist ?? UNKNOWN,
      album: album ?? UNKNOWN,
      cover: picture && picture.length ? picture[0].data : null,
      path: filePath,
      duration: format.duration ?? 0,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};

module.exports = {
  parseMusicFile,
};
