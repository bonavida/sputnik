import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TEXT_LENGTH, isTrack } from '@shared/guards';
import { COVER_PNG, mp3, wav, writeFixture } from '../../testing/makeAudio';
import { createCoverStore } from '../covers';
import { createLibrary, trackIdFor } from '../library';

// Pass-through mock: lets a test make one folder unreadable, which cannot be set
// up portably with real permissions
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readdir: vi.fn<typeof actual.readdir>(actual.readdir) };
});

const actualReaddir = (
  await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
).readdir;

const RED_BGRA = Uint8Array.from(
  Array.from({ length: 16 }, () => [40, 30, 220, 255]).flat()
);

let root: string;
let coversDir: string;

const setup = () => {
  const covers = createCoverStore({ dir: coversDir, toBitmap: () => RED_BGRA });
  return createLibrary({ covers });
};

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sputnik-library-'));
  coversDir = path.join(root, 'covers');
});

afterEach(async () => {
  vi.mocked(readdir).mockImplementation(actualReaddir);
  await rm(root, { recursive: true, force: true });
});

describe('importPaths', () => {
  it('imports a folder recursively, in natural order, with its metadata', async () => {
    const album = 'Low Orbit';
    await writeFixture(
      root,
      'music/10 Last.mp3',
      mp3({ title: 'Last', artist: 'Mira Calder', album })
    );
    await writeFixture(
      root,
      'music/2 Second.mp3',
      mp3({ title: 'Second', artist: 'Mira Calder', album })
    );
    await writeFixture(
      root,
      'music/Sub/Canción #1.wav',
      wav({ title: 'Canción #1', artist: 'Ñandú' })
    );
    await writeFixture(root, 'music/notes.txt', 'not audio');

    const { tracks, failed } = await setup().importPaths([
      path.join(root, 'music'),
    ]);

    expect(failed).toEqual([]);
    expect(tracks.map(({ title }) => title)).toEqual([
      'Second',
      'Last',
      'Canción #1',
    ]);
    expect(tracks[0]).toMatchObject({ artist: 'Mira Calder', album });
    expect(tracks[2]).toMatchObject({ artist: 'Ñandú', album: undefined });
    tracks.forEach(({ duration }) => expect(duration).toBeCloseTo(1, 0));
  });

  it('falls back to the file name when there are no tags', async () => {
    const file = await writeFixture(root, 'untagged song.wav', wav());

    const { tracks } = await setup().importPaths([file]);

    expect(tracks[0]).toMatchObject({
      title: 'untagged song',
      artist: undefined,
      album: undefined,
    });
  });

  it('reports what failed without dropping the rest of the batch (E9)', async () => {
    const good = await writeFixture(root, 'good.mp3', mp3({ title: 'Good' }));
    const broken = await writeFixture(
      root,
      'broken.mp3',
      Buffer.from('definitely not audio')
    );
    const text = await writeFixture(root, 'readme.txt', 'hello');
    const missing = path.join(root, 'gone.mp3');

    const { tracks, failed } = await setup().importPaths([
      good,
      broken,
      text,
      missing,
    ]);

    expect(tracks.map(({ title }) => title)).toEqual(['Good']);
    expect(failed).toEqual(
      expect.arrayContaining([
        { path: broken, reason: 'unreadable' },
        { path: text, reason: 'unsupported' },
        { path: missing, reason: 'missing' },
      ])
    );
    expect(failed).toHaveLength(3);
  });

  it('stores an album cover once even when several tracks embed it (E8)', async () => {
    const first = await writeFixture(
      root,
      'a.mp3',
      mp3({ title: 'A', cover: COVER_PNG })
    );
    const second = await writeFixture(
      root,
      'b.mp3',
      mp3({ title: 'B', cover: COVER_PNG })
    );

    const { tracks } = await setup().importPaths([first, second]);

    expect(tracks[0]?.coverUrl).toMatch(
      /^sputnik:\/\/cover\/[a-f0-9]{40}\.png$/
    );
    expect(tracks[1]?.coverUrl).toBe(tracks[0]?.coverUrl);
    expect(await readdir(coversDir)).toHaveLength(1);
  });

  it('attaches the dominant cover color to the track', async () => {
    const file = await writeFixture(
      root,
      'a.mp3',
      mp3({ title: 'A', cover: COVER_PNG })
    );

    const { tracks } = await setup().importPaths([file]);

    expect(tracks[0]?.color).toEqual([220, 30, 40]);
  });

  it('imports the readable folders and reports the ones it cannot list', async () => {
    await writeFixture(root, 'docs/Music/a.mp3', mp3({ title: 'A' }));
    await writeFixture(root, 'docs/Locked/b.mp3', mp3({ title: 'B' }));
    const locked = path.join(root, 'docs', 'Locked');
    vi.mocked(readdir).mockImplementation(((dir: string, options: never) =>
      dir === locked
        ? Promise.reject(Object.assign(new Error('EPERM'), { code: 'EPERM' }))
        : actualReaddir(dir, options)) as typeof readdir);

    const { tracks, failed } = await setup().importPaths([
      path.join(root, 'docs'),
    ]);

    expect(tracks.map(({ title }) => title)).toEqual(['A']);
    expect(failed).toEqual([{ path: locked, reason: 'unreadable' }]);
  });

  it('caps huge tags so the track can still be saved', async () => {
    const file = await writeFixture(
      root,
      'long.mp3',
      mp3({ title: 'x'.repeat(5_000), artist: 'y'.repeat(5_000) })
    );

    const { tracks } = await setup().importPaths([file]);

    expect(tracks[0]?.title).toHaveLength(MAX_TEXT_LENGTH);
    expect(isTrack(tracks[0])).toBe(true);
  });

  it('imports each path once when it is passed twice', async () => {
    const file = await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));

    const { tracks } = await setup().importPaths([file, file, root]);

    expect(tracks).toHaveLength(1);
  });
});

describe('media allowlist', () => {
  it('only resolves ids of imported tracks (E1)', async () => {
    const file = await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));
    const library = setup();

    expect(library.resolveMedia(trackIdFor(file))).toBeUndefined();

    const { tracks } = await library.importPaths([file]);

    expect(library.resolveMedia(tracks[0]?.id ?? '')).toBe(file);
    expect(library.resolveMedia('../../etc/passwd')).toBeUndefined();
  });

  it('restores persisted tracks and reports the missing ones', async () => {
    const file = await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));
    const gone = path.join(root, 'gone.mp3');
    const library = setup();

    const { missing } = await library.restore([file, gone]);

    expect(missing).toEqual([gone]);
    expect(library.resolveMedia(trackIdFor(file))).toBe(file);
  });

  it('never allowlists non-audio files on restore', async () => {
    const secret = await writeFixture(root, 'secret.txt', 'token');
    const library = setup();

    const { missing } = await library.restore([secret]);

    expect(missing).toEqual([secret]);
    expect(library.resolveMedia(trackIdFor(secret))).toBeUndefined();
  });
});
