import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_TEXT_LENGTH } from '@shared/guards';
import { buildM3u, parseM3u } from '@shared/m3u';
import type { Track } from '@shared/types';

export interface M3uFileContent {
  name: string;
  /** Absolute paths, resolved relative to the playlist file */
  paths: string[];
  /** Entries that are not local files (URLs, untrusted network paths) */
  unsupported: string[];
}

const URL_WITH_SCHEME = /^[a-z][a-z\d+.-]+:\/\//i;
// \\server\share, //server/share and the extended \\?\UNC\server\share form
const NETWORK_PATH =
  /^(?:[\\/]{2}[?.][\\/]UNC[\\/]|[\\/]{2}(?![?.][\\/]))([^\\/]+)/i;

type Resolved = { path: string } | { unsupported: string };

/** Server of a Windows network (UNC) path, lowercased; undefined for local paths */
export const networkHost = (filePath: string): string | undefined =>
  NETWORK_PATH.exec(filePath)?.[1]?.toLowerCase();

const toPath = (location: string, dir: string): Resolved => {
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

/**
 * Resolves playlist entries to paths. Opening a network path makes Windows
 * authenticate to that server with the user's NTLM credentials, so a playlist
 * from anywhere may only point to the server it was itself opened from.
 */
export const resolveM3uLocations = (
  locations: string[],
  playlistFile: string
): Pick<M3uFileContent, 'paths' | 'unsupported'> => {
  const dir = path.dirname(playlistFile);
  const trustedHost = networkHost(playlistFile);

  const resolved = locations.map((location): Resolved => {
    const entry = toPath(location, dir);
    if (!('path' in entry)) return entry;
    const host = networkHost(entry.path);
    return host && host !== trustedHost ? { unsupported: location } : entry;
  });

  return {
    paths: resolved.flatMap((entry) => ('path' in entry ? [entry.path] : [])),
    unsupported: resolved.flatMap((entry) =>
      'unsupported' in entry ? [entry.unsupported] : []
    ),
  };
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

  return {
    // Capped like every text the renderer persists (see shared/guards.ts)
    name: (name ?? path.parse(file).name).slice(0, MAX_TEXT_LENGTH),
    ...resolveM3uLocations(
      entries.map(({ location }) => location),
      file
    ),
  };
};
