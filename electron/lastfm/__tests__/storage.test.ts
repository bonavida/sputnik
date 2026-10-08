import { describe, expect, it } from 'vitest';
import { DEFAULT_LASTFM_STATE } from '../scrobbler';
import { fromStoredLastfm, toStoredLastfm } from '../storage';
import type { Cipher } from '../storage';

const cipher: Cipher = {
  isAvailable: () => true,
  encrypt: (text) => `enc:${Buffer.from(text).toString('base64')}`,
  decrypt: (data) => {
    if (!data.startsWith('enc:')) throw new Error('Cannot decrypt');
    return Buffer.from(data.slice(4), 'base64').toString();
  },
};
const noKeychain: Cipher = { ...cipher, isAvailable: () => false };

const state = {
  account: { user: 'diego', sessionKey: 'secret-session' },
  isEnabled: true,
  queue: [{ artist: 'A', title: 'One', duration: 200, timestamp: 1 }],
};

describe('Last.fm storage', () => {
  it('never writes the session key in clear text, and reads it back', () => {
    const stored = toStoredLastfm(state, cipher);

    expect(JSON.stringify(stored)).not.toContain('secret-session');
    expect(fromStoredLastfm(stored, cipher)).toEqual(state);
  });

  it('does not store the account without a keychain, but keeps the queue', () => {
    const stored = toStoredLastfm(state, noKeychain);

    expect(stored).toEqual({
      user: undefined,
      sessionKey: undefined,
      isEnabled: true,
      queue: state.queue,
    });
  });

  it('starts disconnected when the key cannot be decrypted anymore', () => {
    const restored = fromStoredLastfm(
      {
        user: 'diego',
        sessionKey: 'from-another-machine',
        isEnabled: false,
        queue: [],
      },
      cipher
    );

    expect(restored).toEqual({ isEnabled: false, queue: [] });
  });

  it('starts with the defaults when nothing was stored', () => {
    expect(fromStoredLastfm(undefined, cipher)).toBe(DEFAULT_LASTFM_STATE);
  });
});
