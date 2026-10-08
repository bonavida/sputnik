import { createHash } from 'node:crypto';
import { isRecord } from '@shared/guards';
import type { Scrobble, ScrobbleTrack } from '@shared/types';

const API_URL = 'https://ws.audioscrobbler.com/2.0/';
const AUTH_URL = 'https://www.last.fm/api/auth/';
/** track.scrobble accepts up to 50 songs per request */
export const MAX_BATCH = 50;

/** Error codes from https://www.last.fm/api/errorcodes that change what we do */
export const LASTFM_ERROR = {
  invalidParameters: 6,
  invalidSession: 9,
  tokenNotAuthorized: 14,
} as const;

/** A Last.fm API error, or code 0 when the request did not get a valid answer */
export class LastfmError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'LastfmError';
    this.code = code;
  }
}

export interface LastfmAccount {
  user: string;
  sessionKey: string;
}

type Params = Record<string, string>;

/**
 * Last.fm's api_sig: every parameter sorted by name as name + value, then the
 * shared secret, hashed with MD5. `format` is never part of the signature.
 */
export const signature = (params: Params, secret: string): string =>
  createHash('md5')
    .update(
      Object.keys(params)
        .toSorted()
        .map((name) => `${name}${params[name]}`)
        .join('') + secret,
      'utf8'
    )
    .digest('hex');

const trackParams = (
  { artist, title, album, duration }: ScrobbleTrack,
  suffix = ''
): Params => ({
  [`artist${suffix}`]: artist,
  [`track${suffix}`]: title,
  ...(album && { [`album${suffix}`]: album }),
  ...(duration > 0 && { [`duration${suffix}`]: String(duration) }),
});

const scrobbleParams = (scrobbles: Scrobble[]): Params =>
  Object.assign(
    {},
    ...scrobbles.map((scrobble, index) => ({
      ...trackParams(scrobble, `[${index}]`),
      [`timestamp[${index}]`]: String(scrobble.timestamp),
    }))
  );

interface ClientOptions {
  apiKey: string;
  apiSecret: string;
  fetch?: typeof globalThis.fetch;
}

export type LastfmClient = ReturnType<typeof createLastfmClient>;

export const createLastfmClient = ({
  apiKey,
  apiSecret,
  fetch = globalThis.fetch,
}: ClientOptions) => {
  // Every call is signed; reads go as GET and writes as POST, as the API requires
  const call = async (
    method: string,
    params: Params,
    { isWrite = false } = {}
  ): Promise<Record<string, unknown>> => {
    const signed = { ...params, method, api_key: apiKey };
    const query = new URLSearchParams({
      ...signed,
      api_sig: signature(signed, apiSecret),
      format: 'json',
    });
    const response = isWrite
      ? await fetch(API_URL, { method: 'POST', body: query })
      : await fetch(`${API_URL}?${query}`);
    const data: unknown = await response.json().catch(() => undefined);
    if (isRecord(data) && typeof data.error === 'number')
      throw new LastfmError(data.error, String(data.message ?? ''));
    if (!response.ok || !isRecord(data))
      throw new LastfmError(0, `Unexpected response (HTTP ${response.status})`);
    return data;
  };

  return {
    /** Page where the user approves the app for `token` */
    authUrl: (token: string): string =>
      `${AUTH_URL}?${new URLSearchParams({ api_key: apiKey, token })}`,

    getToken: async (): Promise<string> => {
      const { token } = await call('auth.getToken', {});
      if (typeof token !== 'string') throw new LastfmError(0, 'No token');
      return token;
    },

    /** Fails with `tokenNotAuthorized` until the user approves the app */
    getSession: async (token: string): Promise<LastfmAccount> => {
      const { session } = await call('auth.getSession', { token });
      if (
        !isRecord(session) ||
        typeof session.name !== 'string' ||
        typeof session.key !== 'string'
      )
        throw new LastfmError(0, 'No session');
      return { user: session.name, sessionKey: session.key };
    },

    updateNowPlaying: async (
      sessionKey: string,
      track: ScrobbleTrack
    ): Promise<void> => {
      await call(
        'track.updateNowPlaying',
        { sk: sessionKey, ...trackParams(track) },
        { isWrite: true }
      );
    },

    /** Up to MAX_BATCH songs; Last.fm may ignore some (e.g. too old), which is final */
    scrobble: async (
      sessionKey: string,
      scrobbles: Scrobble[]
    ): Promise<void> => {
      await call(
        'track.scrobble',
        { sk: sessionKey, ...scrobbleParams(scrobbles) },
        { isWrite: true }
      );
    },
  };
};
