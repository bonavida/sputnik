import path from 'node:path';
import {
  app,
  BrowserWindow,
  nativeImage,
  nativeTheme,
  protocol,
  session,
} from 'electron';
import { APP_ID, APP_ORIGIN, APP_SCHEME } from '@shared/constants';
import type { PersistedState } from '@shared/types';
import { createCoverStore } from './library/covers';
import { registerIpc } from './ipc/handlers';
import { isTrustedUrl } from './ipc/validators';
import { createJsonStore } from './storage/jsonStore';
import { createLibrary } from './library/library';
import { createProtocolHandler } from './protocol/protocol';
import {
  DEFAULT_STATE,
  parseStoredState,
  toPersistedState,
} from './storage/state';
import type { StoredState } from './storage/state';
import { createMainWindow } from './window/window';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const IS_DEV = Boolean(DEV_SERVER_URL);
const APP_DIR = path.join(import.meta.dirname, '../dist');
const PRELOAD = path.join(import.meta.dirname, 'preload.cjs');
const COVER_THUMBNAIL_SIZE = 32;
// Packaged builds take their icon from the executable or app bundle; in dev the
// window would show Electron's own icon. macOS uses the version with Apple's margin
const DEV_ICON = IS_DEV
  ? path.join(
      import.meta.dirname,
      '../build',
      process.platform === 'darwin' ? 'icon-mac.png' : 'icon.png'
    )
  : undefined;

// Must run before `ready`: lets `sputnik://` stream media and use fetch like https
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const trusted = (url: string) => isTrustedUrl(url, APP_ORIGIN, DEV_SERVER_URL);

const coverBitmap = (data: Uint8Array) => {
  const image = nativeImage.createFromBuffer(Buffer.from(data));
  if (image.isEmpty()) return undefined;
  return image
    .resize({
      width: COVER_THUMBNAIL_SIZE,
      height: COVER_THUMBNAIL_SIZE,
      quality: 'good',
    })
    .toBitmap();
};

const start = async () => {
  if (DEV_ICON) app.dock?.setIcon(DEV_ICON);
  const userData = app.getPath('userData');
  const covers = createCoverStore({
    dir: path.join(userData, 'covers'),
    toBitmap: coverBitmap,
  });
  const library = createLibrary({ covers });
  const store = createJsonStore<StoredState>({
    file: path.join(userData, 'sputnik.json'),
    defaults: DEFAULT_STATE,
    parse: parseStoredState,
  });
  let state = await store.read();

  const update = (patch: Partial<StoredState>) => {
    state = { ...state, ...patch };
    store.write(state);
  };

  protocol.handle(
    APP_SCHEME,
    createProtocolHandler({
      resolveMedia: library.resolveMedia,
      coversDir: covers.dir,
      appDir: APP_DIR,
    })
  );

  // The app needs no camera, notifications, geolocation…
  session.defaultSession.setPermissionRequestHandler((_, __, callback) =>
    callback(false)
  );
  session.defaultSession.setPermissionCheckHandler(() => false);

  nativeTheme.themeSource = state.settings.theme;

  registerIpc({
    library,
    isTrustedUrl: trusted,
    loadState: (): PersistedState => toPersistedState(state),
    saveState: update,
  });

  const openWindow = () => {
    const window = createMainWindow({
      preload: PRELOAD,
      bounds: state.windowBounds,
      isDev: IS_DEV,
      icon: DEV_ICON,
      isTrustedUrl: trusted,
      onBoundsChange: (windowBounds) => update({ windowBounds }),
    });
    void window.loadURL(DEV_SERVER_URL ?? `${APP_ORIGIN}/index.html`);
    return window;
  };

  openWindow();

  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });

  // Persist pending writes before the process exits
  let isFlushed = false;
  app.on('before-quit', (event) => {
    if (isFlushed) return;
    event.preventDefault();
    void store.flush().finally(() => {
      isFlushed = true;
      app.quit();
    });
  });
};

if (app.requestSingleInstanceLock()) {
  app.setAppUserModelId(APP_ID);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  void app.whenReady().then(start);
} else {
  app.quit();
}
