import { BrowserWindow, nativeTheme, screen } from 'electron';
import type { WindowBounds } from './state';

const DEFAULT_SIZE = { width: 1100, height: 720 };
const MIN_SIZE = { width: 380, height: 520 };
export const TITLE_BAR_HEIGHT = 40;

// Match the renderer's neutral palette so there is no flash before it paints
const NEUTRAL = {
  light: { background: '#f7f7f5', symbol: '#1b1b1b' },
  dark: { background: '#161616', symbol: '#f1f1f1' },
};

interface MainWindowOptions {
  preload: string;
  bounds?: WindowBounds;
  isDev: boolean;
  isTrustedUrl: (url: string) => boolean;
  onBoundsChange: (bounds: WindowBounds) => void;
}

/** Saved bounds are only reused if they are still visible on a connected display */
const isOnScreen = ({ x, y, width, height }: WindowBounds): boolean => {
  const area = screen.getDisplayMatching({ x, y, width, height }).workArea;
  return (
    x < area.x + area.width &&
    x + width > area.x &&
    y < area.y + area.height &&
    y + height > area.y
  );
};

export const createMainWindow = ({
  preload,
  bounds,
  isDev,
  isTrustedUrl,
  onBoundsChange,
}: MainWindowOptions): BrowserWindow => {
  const isMac = process.platform === 'darwin';
  const colors = nativeTheme.shouldUseDarkColors ? NEUTRAL.dark : NEUTRAL.light;
  const restored = bounds && isOnScreen(bounds) ? bounds : undefined;

  const window = new BrowserWindow({
    ...(restored ?? DEFAULT_SIZE),
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    title: 'Sputnik',
    show: false,
    backgroundColor: colors.background,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(!isMac && {
      titleBarOverlay: {
        color: colors.background,
        symbolColor: colors.symbol,
        height: TITLE_BAR_HEIGHT,
      },
    }),
    webPreferences: {
      preload,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: isDev,
    },
  });

  if (restored?.isMaximized) window.maximize();
  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault();
  });

  window.on('close', () => {
    onBoundsChange({
      ...window.getNormalBounds(),
      isMaximized: window.isMaximized(),
    });
  });

  return window;
};
