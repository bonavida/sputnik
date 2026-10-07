import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mediaUrl } from '@shared/constants';
import { writeFixture } from '../../testing/makeAudio';
import { CONTENT_SECURITY_POLICY, createProtocolHandler } from '../protocol';

const SIZE = 1_000;
const BYTES = Buffer.from(
  Array.from({ length: SIZE }, (_, index) => index % 256)
);
const TRACK_ID = 'a'.repeat(40);
const COVER = `${'b'.repeat(40)}.png`;

let root: string;
let audioFile: string;
let handle: (request: Request) => Promise<Response>;

const request = (url: string, init?: RequestInit) =>
  handle(new Request(url, init));

const bodyOf = async (response: Response) =>
  Buffer.from(await response.arrayBuffer());

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sputnik-protocol-'));
  // `#` and `%` in the name used to break playback when paths went in the URL (E3)
  audioFile = await writeFixture(root, 'música/Track #1 100%.mp3', BYTES);
  await writeFixture(root, `covers/${COVER}`, Buffer.from('png-bytes'));
  await writeFixture(root, 'app/index.html', '<!doctype html>');
  await writeFixture(root, 'secret.txt', 'token');

  const allowed = new Map([[TRACK_ID, audioFile]]);
  handle = createProtocolHandler({
    resolveMedia: (id) => allowed.get(id),
    coversDir: path.join(root, 'covers'),
    appDir: path.join(root, 'app'),
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('media', () => {
  it('serves the whole file with its content type', async () => {
    const response = await request(mediaUrl(TRACK_ID));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-length')).toBe(String(SIZE));
    expect(await bodyOf(response)).toEqual(BYTES);
  });

  it('serves byte ranges so seeking works (E2)', async () => {
    const response = await request(mediaUrl(TRACK_ID), {
      headers: { Range: 'bytes=100-199' },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(`bytes 100-199/${SIZE}`);
    expect(response.headers.get('content-length')).toBe('100');
    expect(await bodyOf(response)).toEqual(BYTES.subarray(100, 200));
  });

  it('answers 416 to ranges past the end of the file', async () => {
    const response = await request(mediaUrl(TRACK_ID), {
      headers: { Range: 'bytes=5000-' },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe(`bytes */${SIZE}`);
  });

  it('refuses ids that were not imported (E1)', async () => {
    expect((await request(mediaUrl('c'.repeat(40)))).status).toBe(403);
    expect((await request('sputnik://media/..%2Fsecret.txt')).status).toBe(403);
  });

  it('answers 404 when an imported file was deleted', async () => {
    await rm(audioFile);

    expect((await request(mediaUrl(TRACK_ID))).status).toBe(404);
  });

  it('answers HEAD requests without a body', async () => {
    const response = await request(mediaUrl(TRACK_ID), { method: 'HEAD' });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe(String(SIZE));
    expect((await bodyOf(response)).length).toBe(0);
  });
});

describe('cover', () => {
  it('serves cached covers as immutable images', async () => {
    const response = await request(`sputnik://cover/${COVER}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('immutable');
    // The renderer fetches them for the Media Session artwork
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('does not open media files to other origins', async () => {
    const response = await request(mediaUrl(TRACK_ID));

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it.each(['..%2Fsecret.txt', 'not-a-hash.png', `${'b'.repeat(40)}.exe`])(
    'refuses %s',
    async (name) => {
      expect((await request(`sputnik://cover/${name}`)).status).toBe(404);
    }
  );
});

describe('app', () => {
  it('serves index.html with the Content Security Policy', async () => {
    const response = await request('sputnik://app/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('content-security-policy')).toBe(
      CONTENT_SECURITY_POLICY
    );
  });

  it('refuses paths outside the app folder', async () => {
    await writeFile(path.join(root, 'outside.js'), 'alert(1)');

    expect((await request('sputnik://app/..%2Foutside.js')).status).toBe(403);
    expect((await request('sputnik://app/missing.js')).status).toBe(404);
  });

  it('answers 404 to unknown hosts', async () => {
    expect((await request('sputnik://elsewhere/x')).status).toBe(404);
  });
});
