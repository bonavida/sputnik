import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Rgb } from '@shared/types';
import { dominantColor } from './dominantColor';

const COVER_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

/** `<sha1>.<ext>`: the only file names the cover protocol will serve */
export const COVER_FILE_NAME = /^[a-f0-9]{40}\.(jpg|png|webp|gif|bmp)$/;

export const COVER_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export interface SavedCover {
  fileName: string;
  color?: Rgb;
}

export interface CoverStore {
  dir: string;
  save: (data: Uint8Array, mimeType: string) => Promise<SavedCover | undefined>;
  /** Dominant color of a cached cover, recalculated; undefined if not cached */
  colorOf: (fileName: string) => Promise<SavedCover | undefined>;
}

interface CoverStoreOptions {
  dir: string;
  /** Decodes and downsizes the image to a small BGRA bitmap (Electron's nativeImage in production) */
  toBitmap: (data: Uint8Array) => Uint8Array | undefined;
}

const isAlreadyExists = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'EEXIST';

/**
 * Content-addressed cover cache: every album art is written once, no matter how
 * many tracks embed it, and only its file name travels to the renderer.
 */
export const createCoverStore = ({
  dir,
  toBitmap,
}: CoverStoreOptions): CoverStore => {
  const saved = new Map<string, Promise<SavedCover>>();
  const ready = mkdir(dir, { recursive: true });

  const persist = async (hash: string, extension: string, data: Uint8Array) => {
    await ready;
    const fileName = `${hash}.${extension}`;
    await writeFile(path.join(dir, fileName), data, { flag: 'wx' }).catch(
      (error: unknown) => {
        if (!isAlreadyExists(error)) throw error;
      }
    );
    const bitmap = toBitmap(data);
    return { fileName, color: bitmap ? dominantColor(bitmap) : undefined };
  };

  const save = async (data: Uint8Array, mimeType: string) => {
    const extension = COVER_EXTENSIONS[mimeType.toLowerCase()];
    if (!extension || data.length === 0) return undefined;

    const hash = createHash('sha1').update(data).digest('hex');
    const existing = saved.get(hash);
    if (existing) return existing;

    const pending = persist(hash, extension, data);
    saved.set(hash, pending);
    pending.catch(() => saved.delete(hash));
    return pending;
  };

  // Only names of cached covers, so the renderer cannot make it read other files
  const colorOf = async (fileName: string) => {
    if (!COVER_FILE_NAME.test(fileName)) return undefined;
    try {
      const bitmap = toBitmap(await readFile(path.join(dir, fileName)));
      return { fileName, color: bitmap ? dominantColor(bitmap) : undefined };
    } catch {
      return undefined;
    }
  };

  return { dir, save, colorOf };
};
