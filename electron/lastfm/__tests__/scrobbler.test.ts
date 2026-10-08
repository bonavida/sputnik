import { describe, expect, it, vi } from 'vitest';
import type { Scrobble } from '@shared/types';
import { LASTFM_ERROR, LastfmError } from '../client';
import type { LastfmClient } from '../client';
import { DEFAULT_LASTFM_STATE, createScrobbler } from '../scrobbler';
import type { LastfmState } from '../scrobbler';

const NOW_MS = 1_791_400_000_000;
const NOW_S = NOW_MS / 1000;
const DAY_S = 24 * 60 * 60;
const account = { user: 'diego', sessionKey: 'sk' };

const scrobbleAt = (timestamp: number, title = 'Song'): Scrobble => ({
  artist: 'Artist',
  title,
  duration: 200,
  timestamp,
});

const fakeClient = (overrides: Partial<LastfmClient> = {}): LastfmClient => ({
  authUrl: (token) => `https://www.last.fm/api/auth/?token=${token}`,
  getToken: vi.fn<LastfmClient['getToken']>(async () => 'tok'),
  getSession: vi.fn<LastfmClient['getSession']>(async () => account),
  updateNowPlaying: vi.fn<LastfmClient['updateNowPlaying']>(
    async () => undefined
  ),
  scrobble: vi.fn<LastfmClient['scrobble']>(async () => undefined),
  ...overrides,
});

const setup = ({
  client = fakeClient(),
  initial = { ...DEFAULT_LASTFM_STATE, account } as LastfmState,
  now = () => NOW_MS,
} = {}) => {
  const saved: LastfmState[] = [];
  const openUrl = vi.fn<(url: string) => Promise<void>>(async () => undefined);
  let clock = 0;
  const scrobbler = createScrobbler({
    client,
    initial,
    save: (state) => saved.push(state),
    openUrl,
    now: () => now() + clock,
    // Polling advances a fake clock instead of waiting for real
    wait: async (ms) => {
      clock += ms;
    },
  });
  return { scrobbler, client, saved, openUrl, lastSaved: () => saved.at(-1) };
};

describe('scrobbling', () => {
  it('sends a scrobble right away and empties the queue', async () => {
    const { scrobbler, client } = setup();

    await scrobbler.scrobble(scrobbleAt(NOW_S));

    expect(client.scrobble).toHaveBeenCalledWith('sk', [scrobbleAt(NOW_S)]);
    expect(scrobbler.status().pending).toBe(0);
  });

  it('keeps scrobbles while offline and sends them later in order', async () => {
    const scrobble = vi
      .fn<LastfmClient['scrobble']>()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue(undefined);
    const { scrobbler, lastSaved } = setup({
      client: fakeClient({ scrobble }),
    });

    await scrobbler.scrobble(scrobbleAt(NOW_S - 60, 'First'));
    expect(scrobbler.status().pending).toBe(1);
    expect(lastSaved()?.queue).toHaveLength(1);

    await scrobbler.scrobble(scrobbleAt(NOW_S, 'Second'));
    expect(scrobble).toHaveBeenLastCalledWith('sk', [
      scrobbleAt(NOW_S - 60, 'First'),
      scrobbleAt(NOW_S, 'Second'),
    ]);
    expect(scrobbler.status().pending).toBe(0);
  });

  it('sends a long queue in batches of 50', async () => {
    const queue = Array.from({ length: 120 }, (_, index) =>
      scrobbleAt(NOW_S - 1000 + index)
    );
    const { scrobbler, client } = setup({
      initial: { isEnabled: true, account, queue },
    });

    await scrobbler.start();

    expect(
      vi.mocked(client.scrobble).mock.calls.map(([, batch]) => batch.length)
    ).toEqual([50, 50, 20]);
    expect(scrobbler.status().pending).toBe(0);
  });

  it('drops scrobbles older than two weeks, which Last.fm would reject', async () => {
    const { scrobbler, client } = setup({
      initial: {
        isEnabled: true,
        account,
        queue: [scrobbleAt(NOW_S - 15 * DAY_S), scrobbleAt(NOW_S - DAY_S)],
      },
    });

    await scrobbler.start();

    expect(client.scrobble).toHaveBeenCalledWith('sk', [
      scrobbleAt(NOW_S - DAY_S),
    ]);
  });

  it('drops a batch Last.fm calls invalid instead of retrying it forever', async () => {
    const { scrobbler } = setup({
      client: fakeClient({
        scrobble: vi.fn<LastfmClient['scrobble']>(async () => {
          throw new LastfmError(LASTFM_ERROR.invalidParameters, 'Invalid');
        }),
      }),
    });

    await scrobbler.scrobble(scrobbleAt(NOW_S));

    expect(scrobbler.status().pending).toBe(0);
  });

  it('forgets a revoked session but keeps the queue for a reconnection', async () => {
    const { scrobbler } = setup({
      client: fakeClient({
        scrobble: vi.fn<LastfmClient['scrobble']>(async () => {
          throw new LastfmError(LASTFM_ERROR.invalidSession, 'Invalid session');
        }),
      }),
    });

    await scrobbler.scrobble(scrobbleAt(NOW_S));

    expect(scrobbler.status()).toMatchObject({ user: undefined, pending: 1 });
  });

  it('ignores songs while paused by the user or not connected', async () => {
    const paused = setup({
      initial: { isEnabled: false, account, queue: [] },
    });
    await paused.scrobbler.scrobble(scrobbleAt(NOW_S));
    await paused.scrobbler.nowPlaying(scrobbleAt(NOW_S));
    expect(paused.client.scrobble).not.toHaveBeenCalled();
    expect(paused.client.updateNowPlaying).not.toHaveBeenCalled();
    expect(paused.scrobbler.status().pending).toBe(0);

    const disconnected = setup({ initial: DEFAULT_LASTFM_STATE });
    await disconnected.scrobbler.scrobble(scrobbleAt(NOW_S));
    expect(disconnected.scrobbler.status().pending).toBe(0);
  });

  it('does nothing in a build without an API key', async () => {
    const openUrl = vi.fn<(url: string) => Promise<void>>(
      async () => undefined
    );
    const noKey = createScrobbler({
      initial: DEFAULT_LASTFM_STATE,
      save: () => undefined,
      openUrl,
    });

    expect(noKey.status().isAvailable).toBe(false);
    expect(await noKey.connect()).toBe('failed');
    expect(openUrl).not.toHaveBeenCalled();
  });
});

describe('connecting an account', () => {
  it('opens the approval page and waits until the user approves', async () => {
    const getSession = vi
      .fn<LastfmClient['getSession']>()
      .mockRejectedValueOnce(
        new LastfmError(LASTFM_ERROR.tokenNotAuthorized, 'Not yet')
      )
      .mockRejectedValueOnce(
        new LastfmError(LASTFM_ERROR.tokenNotAuthorized, 'Not yet')
      )
      .mockResolvedValue(account);
    const { scrobbler, openUrl, lastSaved } = setup({
      client: fakeClient({ getSession }),
      initial: DEFAULT_LASTFM_STATE,
    });

    expect(await scrobbler.connect()).toBe('connected');

    expect(openUrl).toHaveBeenCalledWith(
      'https://www.last.fm/api/auth/?token=tok'
    );
    expect(getSession).toHaveBeenCalledTimes(3);
    expect(scrobbler.status()).toMatchObject({
      user: 'diego',
      isEnabled: true,
    });
    expect(lastSaved()?.account).toEqual(account);
  });

  it('gives up after five minutes without approval', async () => {
    const { scrobbler } = setup({
      client: fakeClient({
        getSession: vi.fn<LastfmClient['getSession']>(async () => {
          throw new LastfmError(LASTFM_ERROR.tokenNotAuthorized, 'Not yet');
        }),
      }),
      initial: DEFAULT_LASTFM_STATE,
    });

    expect(await scrobbler.connect()).toBe('timed-out');
    expect(scrobbler.status().user).toBeUndefined();
  });

  it('stops waiting when the user cancels', async () => {
    let scrobblerRef: ReturnType<typeof setup>['scrobbler'] | undefined;
    const getSession = vi.fn<LastfmClient['getSession']>(async () => {
      scrobblerRef?.cancelConnect();
      throw new LastfmError(LASTFM_ERROR.tokenNotAuthorized, 'Not yet');
    });
    const { scrobbler } = setup({
      client: fakeClient({ getSession }),
      initial: DEFAULT_LASTFM_STATE,
    });
    scrobblerRef = scrobbler;

    expect(await scrobbler.connect()).toBe('cancelled');
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it('reports a failure when Last.fm cannot be reached', async () => {
    const { scrobbler } = setup({
      client: fakeClient({
        getToken: vi.fn<LastfmClient['getToken']>(async () => {
          throw new TypeError('fetch failed');
        }),
      }),
      initial: DEFAULT_LASTFM_STATE,
    });

    expect(await scrobbler.connect()).toBe('failed');
  });

  it('forgets the account and its pending scrobbles on disconnect', () => {
    const { scrobbler, lastSaved } = setup({
      initial: { isEnabled: true, account, queue: [scrobbleAt(NOW_S)] },
    });

    expect(scrobbler.disconnect()).toMatchObject({
      user: undefined,
      pending: 0,
    });
    expect(lastSaved()).toMatchObject({ account: undefined, queue: [] });
  });
});
