import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_TEXT_LENGTH } from '@shared/guards';
import type { Track } from '@shared/types';
import { mp3, writeFixture } from '../../testing/makeAudio';
import { createCoverStore } from '../covers';
import { createLibrary } from '../library';
import { inPlaylistOrder, readM3uFile, writeM3uFile } from '../m3uFiles';

let root: string;

const track = (filePath: string, title: string): Track => ({
  id: title,
  path: filePath,
  title,
  artist: 'Mira',
  duration: 61,
});

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sputnik-m3u-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('M3U files', () => {
  it('reads back the name and the tracks it exported, in order', async () => {
    const tracks = [
      track(path.join(root, 'music', 'b.mp3'), 'B'),
      track(path.join(root, 'música', 'Canción #1.mp3'), 'Canción #1'),
    ];
    const file = path.join(root, 'playlists', 'Domingo.m3u8');
    await writeFixture(root, 'playlists/.keep', '');

    await writeM3uFile(file, 'Domingo tranquilo', tracks);

    expect(await readM3uFile(file)).toEqual({
      name: 'Domingo tranquilo',
      paths: tracks.map(({ path: trackPath }) => trackPath),
      unsupported: [],
    });
  });

  it('resolves relative paths against the playlist location and file:// URLs', async () => {
    const absolute = path.join(root, 'elsewhere', 'c d.mp3');
    const file = await writeFixture(
      root,
      'lists/mixed.m3u',
      [
        '../music/a.mp3',
        'b.mp3',
        pathToFileURL(absolute).href,
        'https://radio.example/stream',
      ].join('\n')
    );

    expect(await readM3uFile(file)).toEqual({
      name: 'mixed',
      paths: [
        path.join(root, 'music', 'a.mp3'),
        path.join(root, 'lists', 'b.mp3'),
        absolute,
      ],
      unsupported: ['https://radio.example/stream'],
    });
  });

  it('caps a huge playlist name so the list can still be saved', async () => {
    const file = await writeFixture(
      root,
      'huge.m3u8',
      `#EXTM3U\n#PLAYLIST:${'n'.repeat(5_000)}\na.mp3\n`
    );

    expect((await readM3uFile(file)).name).toHaveLength(MAX_TEXT_LENGTH);
  });

  it('reports entries that no longer exist when importing them', async () => {
    const present = await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));
    const file = await writeFixture(
      root,
      'list.m3u8',
      ['a.mp3', 'gone.mp3'].join('\n')
    );
    const library = createLibrary({
      covers: createCoverStore({
        dir: path.join(root, 'covers'),
        toBitmap: () => undefined,
      }),
    });

    const { paths } = await readM3uFile(file);
    const { tracks, failed } = await library.importPaths(paths);

    expect(tracks.map(({ path: trackPath }) => trackPath)).toEqual([present]);
    expect(failed).toEqual([
      { path: path.join(root, 'gone.mp3'), reason: 'missing' },
    ]);
  });

  it('keeps songs that appear more than once, in playlist order', async () => {
    const a = await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));
    const b = await writeFixture(root, 'b.mp3', mp3({ title: 'B' }));
    const file = path.join(root, 'list.m3u8');
    await writeM3uFile(file, 'Mix', [
      track(a, 'A'),
      track(b, 'B'),
      track(a, 'A'),
    ]);

    const { paths } = await readM3uFile(file);
    const { tracks } = await createLibrary({
      covers: createCoverStore({
        dir: path.join(root, 'covers'),
        toBitmap: () => undefined,
      }),
    }).importPaths(paths);

    expect(inPlaylistOrder(paths, tracks).map(({ title }) => title)).toEqual([
      'A',
      'B',
      'A',
    ]);
  });

  it('keeps the songs of a folder entry where the folder is listed', async () => {
    await writeFixture(root, 'album/1.mp3', mp3({ title: 'One' }));
    await writeFixture(root, 'album/2.mp3', mp3({ title: 'Two' }));
    await writeFixture(root, 'a.mp3', mp3({ title: 'A' }));
    const file = await writeFixture(
      root,
      'list.m3u8',
      ['a.mp3', 'album', 'gone.mp3', 'a.mp3'].join('\n')
    );

    const { paths } = await readM3uFile(file);
    const { tracks } = await createLibrary({
      covers: createCoverStore({
        dir: path.join(root, 'covers'),
        toBitmap: () => undefined,
      }),
    }).importPaths(paths);

    expect(inPlaylistOrder(paths, tracks).map(({ title }) => title)).toEqual([
      'A',
      'One',
      'Two',
      'A',
    ]);
  });
});
