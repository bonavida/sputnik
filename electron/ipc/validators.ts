import { IPC } from '@shared/constants';
import {
  isDialogLabels,
  isPathList,
  isPersistedPatch,
  isText,
  isThemeSource,
  isTitleBarColors,
  isTrackList,
} from '@shared/guards';
import type {
  DialogLabels,
  PersistedState,
  ThemeSource,
  TitleBarColors,
  Track,
} from '@shared/types';

type Channel = (typeof IPC)[keyof typeof IPC];

/**
 * Argument validators per IPC channel. The renderer is treated as untrusted:
 * anything that does not match exactly is rejected before reaching a handler.
 */
export const IPC_ARGS = {
  [IPC.importPaths]: (args: unknown[]): args is [string[]] =>
    args.length === 1 && isPathList(args[0]),
  [IPC.restoreTracks]: (args: unknown[]): args is [string[]] =>
    args.length === 1 && isPathList(args[0]),
  [IPC.openFiles]: (args: unknown[]): args is [DialogLabels] =>
    args.length === 1 && isDialogLabels(args[0]),
  [IPC.openFolder]: (args: unknown[]): args is [DialogLabels] =>
    args.length === 1 && isDialogLabels(args[0]),
  [IPC.exportPlaylist]: (
    args: unknown[]
  ): args is [string, Track[], DialogLabels] =>
    args.length === 3 &&
    isText(args[0]) &&
    isTrackList(args[1]) &&
    isDialogLabels(args[2]),
  [IPC.importPlaylist]: (args: unknown[]): args is [DialogLabels] =>
    args.length === 1 && isDialogLabels(args[0]),
  [IPC.loadState]: (args: unknown[]): args is [] => args.length === 0,
  [IPC.saveState]: (args: unknown[]): args is [Partial<PersistedState>] =>
    args.length === 1 && isPersistedPatch(args[0]),
  [IPC.setTheme]: (args: unknown[]): args is [ThemeSource, TitleBarColors] =>
    args.length === 2 && isThemeSource(args[0]) && isTitleBarColors(args[1]),
} satisfies Record<Channel, (args: unknown[]) => boolean>;

/** Only frames loaded from the app itself (or the Vite dev server) may call IPC */
export const isTrustedUrl = (
  url: string,
  appOrigin: string,
  devServerUrl?: string
): boolean => {
  if (url.startsWith(`${appOrigin}/`)) return true;
  if (!devServerUrl) return false;
  try {
    return new URL(url).origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
};
