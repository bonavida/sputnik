// electron-builder afterPack hook: drops Chromium files Sputnik never uses.
//
// dxcompiler.dll and dxil.dll (~27 MB) compile WebGPU shaders with DXC on
// Windows. The app uses no WebGPU, and Chromium falls back to the FXC compiler
// (d3dcompiler_47.dll, kept) if it ever needs one. Verified by running the
// packaged app: rendering, covers and playback work without them.
// If a future Electron version needs them, delete this hook.
const { rm } = require('node:fs/promises');
const path = require('node:path');

const UNUSED_FILES = {
  win32: ['dxcompiler.dll', 'dxil.dll'],
};

exports.default = async ({ appOutDir, electronPlatformName }) => {
  const files = UNUSED_FILES[electronPlatformName] ?? [];
  await Promise.all(
    files.map((file) => rm(path.join(appOutDir, file), { force: true }))
  );
};
