import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { LASTFM_ERROR, createLastfmClient, signature } from '../client';

const API_KEY = 'key123';
const API_SECRET = 'secret456';

const md5 = (text: string) =>
  createHash('md5').update(text, 'utf8').digest('hex');

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => Response.json(body, { status }));

const sentParams = (fetchMock: ReturnType<typeof respond>) => {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  const body = init?.body;
  return body instanceof URLSearchParams
    ? body
    : new URL(String(url)).searchParams;
};

describe('signature', () => {
  it('hashes the parameters sorted by name, then the secret', () => {
    expect(
      signature({ token: 't', method: 'auth.getSession', api_key: 'k' }, 's')
    ).toBe(md5('api_keykmethodauth.getSessiontokents'));
  });

  it('hashes text as UTF-8', () => {
    expect(signature({ artist: 'Björk' }, 's')).toBe(md5('artistBjörks'));
  });
});

describe('createLastfmClient', () => {
  it('signs every call and asks for JSON without signing the format', async () => {
    const fetchMock = respond({ token: 'tok' });
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      fetch: fetchMock,
    });

    expect(await client.getToken()).toBe('tok');

    const params = sentParams(fetchMock);
    expect(params.get('format')).toBe('json');
    expect(params.get('api_sig')).toBe(
      signature({ method: 'auth.getToken', api_key: API_KEY }, API_SECRET)
    );
  });

  it('builds the approval page URL with the key and token', () => {
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
    });
    expect(client.authUrl('a b')).toBe(
      'https://www.last.fm/api/auth/?api_key=key123&token=a+b'
    );
  });

  it('reads the user and session key once approved', async () => {
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      fetch: respond({ session: { name: 'diego', key: 'sk', subscriber: 0 } }),
    });
    expect(await client.getSession('tok')).toEqual({
      user: 'diego',
      sessionKey: 'sk',
    });
  });

  it('sends a batch of scrobbles as indexed parameters in a POST', async () => {
    const fetchMock = respond({ scrobbles: {} });
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      fetch: fetchMock,
    });

    await client.scrobble('sk', [
      { artist: 'A', title: 'One', album: 'X', duration: 200, timestamp: 100 },
      { artist: 'B', title: 'Two', duration: 0, timestamp: 300 },
    ]);

    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    const params = Object.fromEntries(sentParams(fetchMock));
    expect(params).toMatchObject({
      method: 'track.scrobble',
      sk: 'sk',
      'artist[0]': 'A',
      'track[0]': 'One',
      'album[0]': 'X',
      'duration[0]': '200',
      'timestamp[0]': '100',
      'artist[1]': 'B',
      'track[1]': 'Two',
      'timestamp[1]': '300',
    });
    // Unknown values are left out instead of sent empty
    expect(params).not.toHaveProperty('album[1]');
    expect(params).not.toHaveProperty('duration[1]');
  });

  it('turns API errors into LastfmError with their code', async () => {
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      fetch: respond({ error: 14, message: 'Unauthorized Token' }, 403),
    });
    await expect(client.getSession('tok')).rejects.toMatchObject({
      code: LASTFM_ERROR.tokenNotAuthorized,
    });
  });

  it('reports a server error page as code 0', async () => {
    const client = createLastfmClient({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      fetch: vi.fn<typeof fetch>(
        async () => new Response('<html>Bad gateway</html>', { status: 502 })
      ),
    });
    await expect(client.getToken()).rejects.toMatchObject({ code: 0 });
  });
});
