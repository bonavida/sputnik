const { protocol } = require('electron');
const url = require('url');

const FILE_PROTOCOL = 'file://';
const CUSTOM_PROTOCOL = 'sputnik://';

// This is where we define custom protocols
const init = () => {
  protocol.registerFileProtocol('sputnik', (request, callback) => {
    const filePath = url.fileURLToPath(
      `${FILE_PROTOCOL}${request.url.slice(CUSTOM_PROTOCOL.length)}`
    );
    callback(filePath);
  });
};

module.exports = {
  init,
};
