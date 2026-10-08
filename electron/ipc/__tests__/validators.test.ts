import { describe, expect, it } from 'vitest';
import { APP_ORIGIN, DEFAULT_SETTINGS, IPC } from '@shared/constants';
import { IPC_ARGS, isTrustedUrl } from '../validators';

const labels = { title: 'Añadir canciones', filterName: 'Audio' };
const track = { id: 'a', path: '/a.mp3', title: 'A', duration: 1 };
const scrobbleTrack = {
  artist: 'Mira Calder',
  title: 'Neon Tide',
  duration: 150,
};

describe('IPC_ARGS (E7)', () => {
  it.each([
    [IPC.importPaths, [['/a.mp3']]],
    [IPC.restoreTracks, [[]]],
    [IPC.openFiles, [labels]],
    [IPC.exportPlaylist, ['Mi lista', [track], labels]],
    [IPC.loadState, []],
    [IPC.saveState, [{ settings: DEFAULT_SETTINGS }]],
    [IPC.setTheme, ['dark', { background: '#101010', symbol: '#ffffff' }]],
    [IPC.lastfmConnect, []],
    [IPC.lastfmSetEnabled, [false]],
    [IPC.lastfmNowPlaying, [scrobbleTrack]],
    [IPC.lastfmScrobble, [{ ...scrobbleTrack, timestamp: 1_791_400_000 }]],
    [IPC.updatesInstall, []],
    [IPC.updatesSetAutomatic, [true]],
  ])('%s accepts valid arguments', (channel, args) => {
    expect(IPC_ARGS[channel](args)).toBe(true);
  });

  it.each([
    [IPC.importPaths, ['/a.mp3']],
    [IPC.importPaths, [['/a.mp3'], 'extra']],
    [IPC.openFolder, [{ title: 'x' }]],
    [IPC.exportPlaylist, ['', [track], labels]],
    [
      IPC.exportPlaylist,
      ['Mi lista', [{ ...track, duration: 'long' }], labels],
    ],
    [IPC.loadState, ['unexpected']],
    [IPC.saveState, [{ windowBounds: {} }]],
    [IPC.setTheme, ['sepia', { background: '#101010', symbol: '#ffffff' }]],
    [IPC.lastfmConnect, ['token']],
    [IPC.lastfmSetEnabled, ['yes']],
    [IPC.lastfmNowPlaying, [{ ...scrobbleTrack, artist: undefined }]],
    [IPC.lastfmScrobble, [scrobbleTrack]],
    [IPC.updatesOpenDownload, ['https://evil.example/Sputnik-setup.exe']],
    [IPC.updatesInstall, ['C:/Windows/System32/cmd.exe']],
    [IPC.updatesSetAutomatic, ['true']],
  ])('%s rejects %j', (channel, args) => {
    expect(IPC_ARGS[channel](args)).toBe(false);
  });
});

describe('isTrustedUrl', () => {
  const devServer = 'http://localhost:5173/';

  it('trusts the packaged app and the dev server', () => {
    expect(isTrustedUrl(`${APP_ORIGIN}/index.html`, APP_ORIGIN)).toBe(true);
    expect(
      isTrustedUrl('http://localhost:5173/src/main.tsx', APP_ORIGIN, devServer)
    ).toBe(true);
  });

  it.each([
    'https://evil.example/',
    'http://localhost:5174/',
    'sputnik://media/abc',
    'file:///C:/index.html',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isTrustedUrl(url, APP_ORIGIN, devServer)).toBe(false);
  });
});
