import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './constants';
import {
  MAX_PATHS,
  MAX_PATH_LENGTH,
  isDialogLabels,
  isPathList,
  isPersistedPatch,
  isTitleBarColors,
  isTrack,
} from './guards';
import type { Track } from './types';

const track: Track = {
  id: 'abc',
  path: 'C:\\Music\\a.mp3',
  title: 'A',
  duration: 12.5,
  color: [10, 20, 30],
};

describe('isPathList', () => {
  it('accepts arrays of non-empty strings', () => {
    expect(isPathList(['/a.mp3', 'C:\\b.flac'])).toBe(true);
    expect(isPathList([])).toBe(true);
  });

  it.each([
    ['a string', '/a.mp3'],
    ['non-string items', ['/a.mp3', 42]],
    ['empty strings', ['']],
    ['null', null],
    ['an object', { 0: '/a.mp3' }],
  ])('rejects %s', (_, value) => {
    expect(isPathList(value)).toBe(false);
  });

  it('rejects oversized payloads', () => {
    expect(isPathList(['x'.repeat(MAX_PATH_LENGTH + 1)])).toBe(false);
    expect(isPathList(Array.from({ length: MAX_PATHS + 1 }, () => '/a'))).toBe(
      false
    );
  });
});

describe('isDialogLabels', () => {
  it('requires a title and a filter name', () => {
    expect(isDialogLabels({ title: 'Añadir', filterName: 'Audio' })).toBe(true);
    expect(isDialogLabels({ title: 'Añadir' })).toBe(false);
    expect(isDialogLabels({ title: '', filterName: 'Audio' })).toBe(false);
  });
});

describe('isTitleBarColors', () => {
  it('only accepts #rrggbb colors', () => {
    expect(isTitleBarColors({ background: '#1a2B3c', symbol: '#ffffff' })).toBe(
      true
    );
    expect(isTitleBarColors({ background: 'red', symbol: '#ffffff' })).toBe(
      false
    );
    expect(isTitleBarColors({ background: '#fff', symbol: '#ffffff' })).toBe(
      false
    );
  });
});

describe('isTrack', () => {
  it('accepts a valid track', () => {
    expect(isTrack(track)).toBe(true);
  });

  it.each([
    ['a negative duration', { ...track, duration: -1 }],
    ['a NaN duration', { ...track, duration: Number.NaN }],
    ['an out of range color', { ...track, color: [0, 0, 256] }],
    ['a color with 4 channels', { ...track, color: [0, 0, 0, 0] }],
    ['a missing title', { ...track, title: undefined }],
    ['a non-string artist', { ...track, artist: 7 }],
  ])('rejects %s', (_, value) => {
    expect(isTrack(value)).toBe(false);
  });
});

describe('isPersistedPatch', () => {
  it('accepts partial state with known keys', () => {
    expect(isPersistedPatch({ settings: DEFAULT_SETTINGS })).toBe(true);
    expect(
      isPersistedPatch({
        playlists: [
          {
            id: 'p',
            name: 'Lista',
            tracks: [track],
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        session: { queue: [track], currentIndex: 0, playlistName: 'Lista' },
      })
    ).toBe(true);
  });

  it('rejects unknown keys so the renderer cannot write arbitrary data', () => {
    expect(isPersistedPatch({ windowBounds: { x: 0 } })).toBe(false);
  });

  it('rejects invalid settings values', () => {
    expect(
      isPersistedPatch({ settings: { ...DEFAULT_SETTINGS, volume: 2 } })
    ).toBe(false);
    expect(
      isPersistedPatch({ settings: { ...DEFAULT_SETTINGS, theme: 'neon' } })
    ).toBe(false);
  });

  it('rejects sessions with an invalid current index', () => {
    const session = { queue: [], currentIndex: -1, playlistName: 'Lista' };
    expect(isPersistedPatch({ session })).toBe(false);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, '12'])(
    'rejects a playback position of %s',
    (position) => {
      expect(isPersistedPatch({ session: { queue: [], position } })).toBe(
        false
      );
    }
  );

  it('accepts a playback position in seconds', () => {
    expect(isPersistedPatch({ session: { queue: [], position: 83.4 } })).toBe(
      true
    );
  });
});
