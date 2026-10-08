import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import type { ReleaseAsset } from './release';

export class VerificationError extends Error {
  constructor(name: string) {
    super(`${name} does not match the SHA-256 published on GitHub`);
    this.name = 'VerificationError';
  }
}

/**
 * Downloads an installer into `dir` and checks it against the SHA-256 GitHub
 * publishes for it. The hash is computed while writing, so the file is read
 * once; a file that does not match is deleted before anyone can run it.
 */
export const downloadInstaller = async (
  { name, url, sha256 }: ReleaseAsset,
  dir: string,
  fetch: typeof globalThis.fetch = globalThis.fetch
): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok || !response.body)
    throw new Error(`Download failed (HTTP ${response.status})`);

  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  const hash = createHash('sha256');
  const hashing = new Transform({
    transform: (chunk: Buffer, _, done) => {
      hash.update(chunk);
      done(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream),
      hashing,
      createWriteStream(file)
    );
    if (hash.digest('hex') !== sha256) throw new VerificationError(name);
    return file;
  } catch (error) {
    await rm(file, { force: true });
    throw error;
  }
};
