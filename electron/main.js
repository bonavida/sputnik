const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} = require('electron-extension-installer');
/** Modules */
const ipc = require('./ipc');
const protocol = require('./protocol');

const { NODE_ENV, ELECTRON_START_URL } = process.env;

const isDev = NODE_ENV === 'development';
const isMacOs = process.platform === 'darwin';

// Keep a global reference of the window object
let mainWindow;

// Initialize IPC handlers
ipc.init();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    minWidth: 600,
    minHeight: 600,
    width: 800,
    height: 1200,
    webPreferences: {
      nodeIntegration: false,
      devTools: isDev,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl =
    ELECTRON_START_URL ??
    url.format({
      pathname: path.join(__dirname, '..', 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true,
    });

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', async () => {
  protocol.init();
  createWindow();

  // TODO: Remove
  await installExtension(REACT_DEVELOPER_TOOLS, {
    loadExtensionOptions: {
      allowFileAccess: true,
    },
  });
});

app.on('window-all-closed', () => {
  !isMacOs && app.quit();
});

app.on('activate', () => {
  !mainWindow && createWindow();
});
