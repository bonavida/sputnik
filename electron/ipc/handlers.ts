import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { AUDIO_EXTENSIONS, PLAYLIST_EXTENSIONS } from '@shared/audioFormats';
import { IPC } from '@shared/constants';
import type { PersistedState, PlaylistFileResult } from '@shared/types';
import { IPC_ARGS } from './validators';
import type { Scrobbler } from '../lastfm/scrobbler';
import type { CoverStore } from '../library/covers';
import type { Library } from '../library/library';
import type { Updater } from '../updates/updater';
import { readM3uFile, writeM3uFile } from '../library/m3uFiles';

type Channel = keyof typeof IPC_ARGS;
/** Tuple type a channel's validator narrows its arguments to */
type ArgsOf<C extends Channel> = (typeof IPC_ARGS)[C] extends ((
  args: unknown[]
) => args is infer Args extends unknown[])
  ? Args
  : never;

interface IpcOptions {
  library: Library;
  covers: CoverStore;
  lastfm: Scrobbler;
  updater: Updater;
  isTrustedUrl: (url: string) => boolean;
  loadState: () => PersistedState;
  saveState: (patch: Partial<PersistedState>) => void;
}

const withoutDot = (extensions: readonly string[]) =>
  extensions.map((extension) => extension.slice(1));

// Characters Windows does not allow in file names, plus control characters
const RESERVED_CHARACTERS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);
const FIRST_PRINTABLE_CODE = 32;

const toFileName = (name: string) =>
  [...name]
    .map((character) =>
      RESERVED_CHARACTERS.has(character) ||
      character.charCodeAt(0) < FIRST_PRINTABLE_CODE
        ? '_'
        : character
    )
    .join('')
    .trim() || 'playlist';

const windowOf = (event: IpcMainInvokeEvent) =>
  BrowserWindow.fromWebContents(event.sender);

const openDialog = async (
  event: IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions
): Promise<string[]> => {
  const window = windowOf(event);
  const { canceled, filePaths } = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  return canceled ? [] : filePaths;
};

export const registerIpc = ({
  library,
  covers,
  lastfm,
  updater,
  isTrustedUrl,
  loadState,
  saveState,
}: IpcOptions): void => {
  /**
   * Every handler checks who is calling and what it sends before doing anything,
   * so a compromised renderer cannot reach the file system with arbitrary input.
   */
  const handle = <C extends Channel>(
    channel: C,
    handler: (event: IpcMainInvokeEvent, ...args: ArgsOf<C>) => unknown
  ) => {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      const url = event.senderFrame?.url ?? '';
      if (!isTrustedUrl(url))
        throw new Error(`Untrusted sender for ${channel}`);
      const isValid: (args: unknown[]) => boolean = IPC_ARGS[channel];
      if (!isValid(args)) throw new Error(`Invalid arguments for ${channel}`);
      return handler(event, ...(args as ArgsOf<C>));
    });
  };

  handle(IPC.importPaths, (_, paths) => library.importPaths(paths));
  handle(IPC.restoreTracks, (_, paths) => library.restore(paths));
  handle(IPC.coverColors, async (_, fileNames) => {
    const results = await Promise.all(
      [...new Set(fileNames)].map((fileName) => covers.colorOf(fileName))
    );
    return results.filter((result) => result !== undefined);
  });
  handle(IPC.showInFolder, (_, trackId) => {
    const filePath = library.resolveMedia(trackId);
    if (!filePath) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  handle(IPC.openFiles, (event, { title, filterName }) =>
    openDialog(event, {
      title,
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: filterName, extensions: withoutDot(AUDIO_EXTENSIONS) }],
    })
  );

  handle(IPC.openFolder, (event, { title }) =>
    openDialog(event, {
      title,
      properties: ['openDirectory', 'multiSelections'],
    })
  );

  handle(
    IPC.exportPlaylist,
    async (event, name, tracks, { title, filterName }) => {
      const window = windowOf(event);
      const options: Electron.SaveDialogOptions = {
        title,
        defaultPath: `${toFileName(name)}.m3u8`,
        filters: [{ name: filterName, extensions: ['m3u8'] }],
      };
      const { canceled, filePath } = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (canceled || !filePath) return false;
      await writeM3uFile(filePath, name, tracks);
      return true;
    }
  );

  handle(
    IPC.importPlaylist,
    async (
      event,
      { title, filterName }
    ): Promise<PlaylistFileResult | undefined> => {
      const [file] = await openDialog(event, {
        title,
        properties: ['openFile'],
        filters: [
          { name: filterName, extensions: withoutDot(PLAYLIST_EXTENSIONS) },
        ],
      });
      if (!file) return undefined;

      const { name, paths, unsupported } = await readM3uFile(file);
      const { tracks, failed } = await library.importPaths(paths);
      return {
        name,
        tracks,
        failed: [
          ...failed,
          ...unsupported.map((path) => ({
            path,
            reason: 'unsupported' as const,
          })),
        ],
      };
    }
  );

  handle(IPC.loadState, () => loadState());
  handle(IPC.saveState, (_, patch) => saveState(patch));

  handle(IPC.setTheme, (event, source, { background, symbol }) => {
    nativeTheme.themeSource = source;
    const window = windowOf(event);
    if (!window) return;
    window.setBackgroundColor(background);
    if (process.platform !== 'darwin')
      window.setTitleBarOverlay({ color: background, symbolColor: symbol });
  });

  handle(IPC.lastfmStatus, () => lastfm.status());
  handle(IPC.lastfmConnect, () => lastfm.connect());
  handle(IPC.lastfmCancelConnect, () => lastfm.cancelConnect());
  handle(IPC.lastfmDisconnect, () => lastfm.disconnect());
  handle(IPC.lastfmSetEnabled, (_, isEnabled) => lastfm.setEnabled(isEnabled));
  handle(IPC.lastfmNowPlaying, (_, track) => lastfm.nowPlaying(track));
  handle(IPC.lastfmScrobble, (_, scrobble) => lastfm.scrobble(scrobble));

  handle(IPC.updatesStatus, () => updater.status());
  handle(IPC.updatesCheck, () => updater.check());
  handle(IPC.updatesInstall, () => updater.install());
  handle(IPC.updatesOpenDownload, () => updater.openDownload());
  handle(IPC.updatesOpenNotes, () => updater.openNotes());
  handle(IPC.updatesSkip, () => updater.skip());
  handle(IPC.updatesSetAutomatic, (_, isEnabled) =>
    updater.setAutomatic(isEnabled)
  );
};
