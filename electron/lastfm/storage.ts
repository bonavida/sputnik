import type { StoredLastfm } from '../storage/state';
import { DEFAULT_LASTFM_STATE } from './scrobbler';
import type { LastfmState } from './scrobbler';

/** Electron's safeStorage in the app; tests pass a fake */
export interface Cipher {
  isAvailable: () => boolean;
  encrypt: (text: string) => string;
  /** Throws when the data cannot be decrypted (other user, keychain reset…) */
  decrypt: (data: string) => string;
}

/**
 * The session key is the only secret: it is stored encrypted with the OS
 * keychain, and never written in clear text. Without a keychain (some Linux
 * desktops) it is not stored at all and the user connects again next time.
 */
export const toStoredLastfm = (
  { account, isEnabled, queue }: LastfmState,
  cipher: Cipher
): StoredLastfm => {
  const canStore = account !== undefined && cipher.isAvailable();
  return {
    user: canStore ? account.user : undefined,
    sessionKey: canStore ? cipher.encrypt(account.sessionKey) : undefined,
    isEnabled,
    queue,
  };
};

export const fromStoredLastfm = (
  stored: StoredLastfm | undefined,
  cipher: Cipher
): LastfmState => {
  if (!stored) return DEFAULT_LASTFM_STATE;
  const { user, sessionKey, isEnabled, queue } = stored;
  const base = { isEnabled, queue };
  if (!user || !sessionKey || !cipher.isAvailable()) return base;
  try {
    return {
      ...base,
      account: { user, sessionKey: cipher.decrypt(sessionKey) },
    };
  } catch {
    return base;
  }
};
