import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DEBOUNCE_MS = 300;

export interface JsonStore<Data> {
  read: () => Promise<Data>;
  /** Debounced; the latest value wins */
  write: (data: Data) => void;
  /** Writes any pending data now (call it before quitting) */
  flush: () => Promise<void>;
}

interface JsonStoreOptions<Data> {
  file: string;
  defaults: Data;
  /** Validates and migrates raw JSON; undefined means the file is unusable */
  parse: (value: unknown) => Data | undefined;
  debounceMs?: number;
}

const isNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * Small JSON file store with atomic writes (temp file + rename), so a crash
 * mid-write never leaves a truncated file behind. A corrupt file is kept as
 * `<file>.corrupt` and the defaults are used instead.
 */
export const createJsonStore = <Data>({
  file,
  defaults,
  parse,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: JsonStoreOptions<Data>): JsonStore<Data> => {
  let pending: { data: Data } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue: Promise<void> = Promise.resolve();

  const read = async () => {
    const content = await readFile(file, 'utf8').catch((error: unknown) => {
      if (isNotFound(error)) return undefined;
      throw error;
    });
    if (content === undefined) return defaults;

    try {
      const data = parse(JSON.parse(content));
      if (data !== undefined) return data;
    } catch {
      // Invalid JSON: handled below like any unusable content
    }
    await rename(file, `${file}.corrupt`).catch(() => undefined);
    return defaults;
  };

  const writeAtomic = async (data: Data) => {
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    await writeFile(temp, JSON.stringify(data), 'utf8');
    await rename(temp, file);
  };

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const next = pending;
    pending = undefined;
    if (!next) return queue;

    queue = queue
      // A failed write must not block the ones after it
      .catch(() => undefined)
      .then(() => writeAtomic(next.data))
      .catch((error: unknown) => {
        // Keep the data for the next attempt unless newer data arrived meanwhile
        pending ??= next;
        throw error;
      });
    return queue;
  };

  const write = (data: Data) => {
    pending = { data };
    clearTimeout(timer);
    timer = setTimeout(() => {
      flush().catch(() => undefined);
    }, debounceMs);
  };

  return { read, write, flush };
};
