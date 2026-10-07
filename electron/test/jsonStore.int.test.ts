import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonStore } from '../jsonStore';

interface Data {
  count: number;
}

const DEFAULTS: Data = { count: 0 };

const parse = (value: unknown): Data | undefined =>
  typeof value === 'object' &&
  value !== null &&
  'count' in value &&
  typeof value.count === 'number'
    ? { count: value.count }
    : undefined;

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false
  );

let root: string;
let file: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sputnik-store-'));
  file = path.join(root, 'nested', 'sputnik.json');
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(root, { recursive: true, force: true });
});

describe('createJsonStore', () => {
  it('returns the defaults when there is no file yet', async () => {
    const store = createJsonStore({ file, defaults: DEFAULTS, parse });

    expect(await store.read()).toEqual(DEFAULTS);
  });

  it('writes atomically and reads back what it wrote', async () => {
    const store = createJsonStore({ file, defaults: DEFAULTS, parse });

    store.write({ count: 3 });
    await store.flush();

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 3 });
    expect(await exists(`${file}.tmp`)).toBe(false);
    expect(
      await createJsonStore({ file, defaults: DEFAULTS, parse }).read()
    ).toEqual({ count: 3 });
  });

  it('debounces writes and keeps only the latest value', async () => {
    vi.useFakeTimers();
    const store = createJsonStore({
      file,
      defaults: DEFAULTS,
      parse,
      debounceMs: 300,
    });

    store.write({ count: 1 });
    store.write({ count: 2 });
    expect(await exists(file)).toBe(false);

    await vi.advanceTimersByTimeAsync(300);
    await store.flush();

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 2 });
  });

  it('keeps writing after a failed write and retries the data it could not save', async () => {
    const store = createJsonStore({ file, defaults: DEFAULTS, parse });
    // A folder where the file should be makes the final rename fail
    await mkdir(file, { recursive: true });

    store.write({ count: 1 });
    await expect(store.flush()).rejects.toHaveProperty('code');

    await rm(file, { recursive: true });
    await store.flush();
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 1 });

    store.write({ count: 2 });
    await store.flush();
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 2 });
  });

  it.each([
    ['invalid JSON', '{ not json'],
    ['an unexpected shape', JSON.stringify({ count: 'many' })],
  ])(
    'falls back to the defaults on %s and keeps a .corrupt copy',
    async (_, content) => {
      const store = createJsonStore({ file, defaults: DEFAULTS, parse });
      store.write(DEFAULTS);
      await store.flush();
      await writeFile(file, content);

      expect(await store.read()).toEqual(DEFAULTS);
      expect(await readFile(`${file}.corrupt`, 'utf8')).toBe(content);
    }
  );
});
