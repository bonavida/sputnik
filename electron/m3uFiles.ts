import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildM3u, parseM3u } from '@shared/m3u';
import type { Track } from '@shared/types';

export interface M3uFileContent {
  name: string;
  /** Absolute paths, resolved relative to the playlist file */
  paths: string[];
  /** Entries that are not local files (http streams, other URLs) */
  unsupported: string[];
}

const URL_WITH_SCHEME = /^[a-z][a-z\d+.-]+:\/\//i;

type Resolved = { path: string } | { unsupported: string };

const resolveLocation = (location: string, dir: string): Resolved => {
  if (location.toLowerCase().startsWith('file:')) {
    try {
      return { path: fileURLToPath(location) };
    } catch {
      return { unsupported: location };
    }
  }
  if (URL_WITH_SCHEME.test(location)) return { unsupported: location };
  return { path: path.resolve(dir, location) };
};

export const writeM3uFile = (
  file: string,
  name: string,
  tracks: Track[]
): Promise<void> =>
  writeFile(
    file,
    buildM3u(
      name,
      tracks.map(({ path: trackPath, title, artist, duration }) => ({
        path: trackPath,
        title,
        artist,
        duration,
      }))
    ),
    'utf8'
  );

export const readM3uFile = async (file: string): Promise<M3uFileContent> => {
  const { name, entries } = parseM3u(await readFile(file, 'utf8'));
  const dir = path.dirname(file);
  const resolved = entries.map(({ location }) =>
    resolveLocation(location, dir)
  );

  return {
    name: name ?? path.parse(file).name,
    paths: resolved.flatMap((entry) => ('path' in entry ? [entry.path] : [])),
    unsupported: resolved.flatMap((entry) =>
      'unsupported' in entry ? [entry.unsupported] : []
    ),
  };
};
