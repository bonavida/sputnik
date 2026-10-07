import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { DEFAULT_STATE, parseStoredState } from './state';

describe('parseStoredState', () => {
  it('fills settings added in newer versions with their defaults', () => {
    const stored = { playlists: [], settings: { theme: 'dark', volume: 0.4 } };

    expect(parseStoredState(stored)?.settings).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      volume: 0.4,
    });
  });

  it('accepts an empty object as a fresh state', () => {
    expect(parseStoredState({})).toEqual({
      ...DEFAULT_STATE,
      session: undefined,
      windowBounds: undefined,
    });
  });

  it('keeps valid window bounds and drops invalid ones', () => {
    const bounds = {
      x: 10,
      y: 20,
      width: 900,
      height: 700,
      isMaximized: false,
    };

    expect(parseStoredState({ windowBounds: bounds })?.windowBounds).toEqual(
      bounds
    );
    expect(
      parseStoredState({ windowBounds: { x: 'a' } })?.windowBounds
    ).toBeUndefined();
  });

  it.each([
    ['not an object', 'hello'],
    ['invalid playlists', { playlists: [{ id: 1 }] }],
    ['invalid settings values', { settings: { volume: 5 } }],
  ])('rejects %s', (_, value) => {
    expect(parseStoredState(value)).toBeUndefined();
  });
});
