import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { isAudioPath } from '@shared/audioFormats';
import { coverUrl } from '@shared/constants';
import { MAX_TEXT_LENGTH } from '@shared/guards';
import type { ImportFailure, ImportResult, Track } from '@shared/types';
import type { CoverStore } from './covers';

const PARSE_CONCURRENCY = 8;
const TRACK_ID = /^[a-f0-9]{40}$/;

export interface Library {
  importPaths: (paths: string[]) => Promise<ImportResult>;
  /** Re-allows persisted tracks after a restart and reports the missing ones */
  restore: (paths: string[]) => Promise<{ missing: string[] }>;
  /** Allowlist lookup used by the media protocol */
  resolveMedia: (id: string) => string | undefined;
}

interface Expanded {
  files: string[];
  failed: ImportFailure[];
}

export const trackIdFor = (filePath: string): string =>
  createHash('sha1').update(filePath).digest('hex');

const naturalOrder = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const unique = (items: string[]): string[] => [...new Set(items)];

const statOrUndefined = (filePath: string) =>
  stat(filePath).catch(() => undefined);

const isFailure = (result: Track | ImportFailure): result is ImportFailure =>
  'reason' in result;

const finiteOrZero = (value: number | undefined): number =>
  value !== undefined && Number.isFinite(value) ? value : 0;

/** Trimmed and capped to what the IPC guards accept, so a huge tag cannot block saving */
const cleanText = (text: string | undefined): string | undefined =>
  text?.trim().slice(0, MAX_TEXT_LENGTH) || undefined;

/**
 * Audio files under `dir`. Folders that cannot be listed (permissions, Windows
 * junctions such as "My Music") are reported instead of failing the import, and
 * links are not followed, so they cannot create loops.
 */
const listAudioFiles = async (dir: string): Promise<Expanded> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    () => undefined
  );
  if (!entries)
    return { files: [], failed: [{ path: dir, reason: 'unreadable' }] };

  const nested = await Promise.all(
    entries.map(async (entry): Promise<Expanded> => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listAudioFiles(entryPath);
      // Non-audio files inside folders (covers, .nfo, .txt…) are skipped silently
      const isAudio = entry.isFile() && isAudioPath(entryPath);
      return { files: isAudio ? [entryPath] : [], failed: [] };
    })
  );
  return {
    files: nested.flatMap(({ files }) => files),
    failed: nested.flatMap(({ failed }) => failed),
  };
};

const expandPath = async (input: string): Promise<Expanded> => {
  const stats = await statOrUndefined(input);
  if (!stats)
    return { files: [], failed: [{ path: input, reason: 'missing' }] };

  if (stats.isDirectory()) {
    const { files, failed } = await listAudioFiles(input);
    return { files: files.toSorted(naturalOrder.compare), failed };
  }

  return isAudioPath(input)
    ? { files: [input], failed: [] }
    : { files: [], failed: [{ path: input, reason: 'unsupported' }] };
};

/** Like Promise.all(items.map(fn)) but with at most `limit` calls in flight */
const mapWithConcurrency = async <Item, Result>(
  items: readonly Item[],
  limit: number,
  fn: (item: Item) => Promise<Result>
): Promise<Result[]> => {
  const results: Result[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as Item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
};

export const createLibrary = ({ covers }: { covers: CoverStore }): Library => {
  const media = new Map<string, string>();

  const allow = (filePath: string): string => {
    const id = trackIdFor(filePath);
    media.set(id, filePath);
    return id;
  };

  const parseTrack = async (
    filePath: string
  ): Promise<Track | ImportFailure> => {
    try {
      const { common, format } = await parseFile(filePath);
      if (!format.container && !format.codec)
        return { path: filePath, reason: 'unreadable' };

      const picture = common.picture?.[0];
      const cover = picture
        ? await covers.save(picture.data, picture.format).catch(() => undefined)
        : undefined;

      return {
        id: allow(filePath),
        path: filePath,
        title: cleanText(common.title) ?? path.parse(filePath).name,
        artist: cleanText(common.artist ?? common.albumartist),
        album: cleanText(common.album),
        duration: finiteOrZero(format.duration),
        coverUrl: cover && coverUrl(cover.fileName),
        color: cover?.color,
      };
    } catch {
      return { path: filePath, reason: 'unreadable' };
    }
  };

  const importPaths = async (paths: string[]): Promise<ImportResult> => {
    const expanded = await Promise.all(unique(paths).map(expandPath));
    const files = unique(expanded.flatMap(({ files: found }) => found));
    const parsed = await mapWithConcurrency(
      files,
      PARSE_CONCURRENCY,
      parseTrack
    );

    return {
      tracks: parsed.filter((result): result is Track => !isFailure(result)),
      failed: [
        ...expanded.flatMap(({ failed }) => failed),
        ...parsed.filter(isFailure),
      ],
    };
  };

  const restore = async (paths: string[]) => {
    const checks = await Promise.all(
      unique(paths).map(async (filePath) => {
        const stats = await statOrUndefined(filePath);
        // Only existing audio files can enter the allowlist
        const isAvailable = isAudioPath(filePath) && Boolean(stats?.isFile());
        if (isAvailable) allow(filePath);
        return { filePath, isAvailable };
      })
    );
    return {
      missing: checks
        .filter(({ isAvailable }) => !isAvailable)
        .map(({ filePath }) => filePath),
    };
  };

  const resolveMedia = (id: string) =>
    TRACK_ID.test(id) ? media.get(id) : undefined;

  return { importPaths, restore, resolveMedia };
};
