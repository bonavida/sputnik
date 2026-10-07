import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { isAudioPath } from '@shared/audioFormats';
import { coverUrl } from '@shared/constants';
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

const cleanText = (text: string | undefined): string | undefined =>
  text?.trim() || undefined;

const expandPath = async (input: string): Promise<Expanded> => {
  const stats = await statOrUndefined(input);
  if (!stats)
    return { files: [], failed: [{ path: input, reason: 'missing' }] };

  if (stats.isDirectory()) {
    const entries = await readdir(input, { recursive: true });
    // Non-audio files inside folders (covers, .nfo, .txt…) are skipped silently
    const files = entries
      .map((entry) => path.join(input, entry))
      .filter(isAudioPath)
      .toSorted(naturalOrder.compare);
    return { files, failed: [] };
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
        duration: format.duration ?? 0,
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
