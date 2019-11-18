const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

const dev = process.env.NODE_ENV === 'development';
const isMacOs = process.platform === 'darwin';

// Keep a global reference of the window object
let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    minWidth: 600,
    minHeight: 600,
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '..', 'build', 'index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  if (dev) {
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  !isMacOs && app.quit();
});

app.on('activate', () => {
  !mainWindow && createWindow();
});