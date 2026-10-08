import type {
  LastfmConnectResult,
  LastfmStatus,
  Scrobble,
  ScrobbleTrack,
} from '@shared/types';
import { LASTFM_ERROR, LastfmError, MAX_BATCH } from './client';
import type { LastfmAccount, LastfmClient } from './client';

/** How long the user has to approve the app in the browser */
const CONNECT_TIMEOUT_MS = 5 * 60_000;
const CONNECT_POLL_MS = 2_000;
/** Last.fm rejects scrobbles older than two weeks */
const MAX_SCROBBLE_AGE_S = 14 * 24 * 60 * 60;

export interface LastfmState {
  account?: LastfmAccount;
  isEnabled: boolean;
  /** Scrobbles not accepted by Last.fm yet, oldest first */
  queue: Scrobble[];
}

export const DEFAULT_LASTFM_STATE: LastfmState = { isEnabled: true, queue: [] };

interface ScrobblerOptions {
  /** Undefined when the build has no API key: everything is a no-op */
  client?: LastfmClient;
  initial: LastfmState;
  save: (state: LastfmState) => void;
  openUrl: (url: string) => Promise<void>;
  /** Milliseconds, like Date.now */
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isLastfmError = (error: unknown, code: number) =>
  error instanceof LastfmError && error.code === code;

/**
 * The user's Last.fm account and the scrobbles waiting to be sent. Scrobbles
 * are queued first and then sent in batches, so none is lost while offline or
 * while Last.fm is down: the queue is retried with every new scrobble and on
 * start.
 */
export const createScrobbler = ({
  client,
  initial,
  save,
  openUrl,
  now = Date.now,
  wait = sleep,
}: ScrobblerOptions) => {
  let state = initial;
  let isFlushing = false;
  let connectAttempt = 0;

  const update = (patch: Partial<LastfmState>) => {
    state = { ...state, ...patch };
    save(state);
  };

  const status = (): LastfmStatus => ({
    isAvailable: Boolean(client),
    user: state.account?.user,
    isEnabled: state.isEnabled,
    pending: state.queue.length,
  });

  const isActive = () => Boolean(client && state.account && state.isEnabled);

  // The user revoked the app on last.fm: forget the account, keep its queue for
  // when they reconnect
  const handleInvalidSession = () => update({ account: undefined });

  const flush = async (): Promise<void> => {
    if (!client || !state.account || isFlushing) return;
    isFlushing = true;
    try {
      const oldest = Math.floor(now() / 1000) - MAX_SCROBBLE_AGE_S;
      if (state.queue.some(({ timestamp }) => timestamp < oldest))
        update({
          queue: state.queue.filter(({ timestamp }) => timestamp >= oldest),
        });

      while (state.queue.length > 0 && state.account) {
        const batch = state.queue.slice(0, MAX_BATCH);
        try {
          await client.scrobble(state.account.sessionKey, batch);
        } catch (error) {
          if (isLastfmError(error, LASTFM_ERROR.invalidSession))
            return handleInvalidSession();
          // Malformed songs will never be accepted; anything else (offline,
          // Last.fm down, rate limit) is retried later
          if (!isLastfmError(error, LASTFM_ERROR.invalidParameters)) return;
        }
        update({ queue: state.queue.slice(batch.length) });
      }
    } finally {
      isFlushing = false;
    }
  };

  return {
    status,

    /** Sends what was left from the last session */
    start: (): Promise<void> => flush(),

    connect: async (): Promise<LastfmConnectResult> => {
      if (!client) return 'failed';
      connectAttempt += 1;
      const attempt = connectAttempt;
      const isCurrent = () => attempt === connectAttempt;
      try {
        const token = await client.getToken();
        await openUrl(client.authUrl(token));
        const deadline = now() + CONNECT_TIMEOUT_MS;
        while (now() < deadline) {
          await wait(CONNECT_POLL_MS);
          if (!isCurrent()) return 'cancelled';
          try {
            const account = await client.getSession(token);
            if (!isCurrent()) return 'cancelled';
            update({ account, isEnabled: true });
            void flush();
            return 'connected';
          } catch (error) {
            if (!isLastfmError(error, LASTFM_ERROR.tokenNotAuthorized))
              throw error;
          }
        }
        return 'timed-out';
      } catch {
        return isCurrent() ? 'failed' : 'cancelled';
      }
    },

    cancelConnect: (): void => {
      connectAttempt += 1;
    },

    /** Forgets the account and its pending scrobbles */
    disconnect: (): LastfmStatus => {
      update({ account: undefined, queue: [] });
      return status();
    },

    setEnabled: (isEnabled: boolean): LastfmStatus => {
      update({ isEnabled });
      return status();
    },

    nowPlaying: async (track: ScrobbleTrack): Promise<void> => {
      if (!client || !state.account || !isActive()) return;
      try {
        await client.updateNowPlaying(state.account.sessionKey, track);
      } catch (error) {
        // Best effort: "now playing" is not worth retrying
        if (isLastfmError(error, LASTFM_ERROR.invalidSession))
          handleInvalidSession();
      }
    },

    scrobble: async (scrobble: Scrobble): Promise<void> => {
      if (!isActive()) return;
      update({ queue: [...state.queue, scrobble] });
      await flush();
    },
  };
};

export type Scrobbler = ReturnType<typeof createScrobbler>;
