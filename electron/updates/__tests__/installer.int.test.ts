import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationError, downloadInstaller } from '../installer';

const CONTENT = Buffer.from('MZ fake installer bytes '.repeat(10_000));
const SHA256 = createHash('sha256').update(CONTENT).digest('hex');
const asset = {
  name: 'Sputnik-2.2.0-setup.exe',
  url: 'https://github.com/bonavida/sputnik/releases/download/v2.2.0/Sputnik-2.2.0-setup.exe',
  size: CONTENT.length,
  sha256: SHA256,
};

const serving = (body: Buffer, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(body, { status }));

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'sputnik-update-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('downloadInstaller', () => {
  it('saves an installer whose SHA-256 matches', async () => {
    const file = await downloadInstaller(asset, dir, serving(CONTENT));

    expect(file).toBe(path.join(dir, asset.name));
    expect(await readFile(file)).toEqual(CONTENT);
  });

  it('deletes a tampered installer instead of leaving it to run', async () => {
    const tampered = Buffer.from(CONTENT);
    tampered[100] = 0;

    await expect(
      downloadInstaller(asset, dir, serving(tampered))
    ).rejects.toBeInstanceOf(VerificationError);
    expect(existsSync(path.join(dir, asset.name))).toBe(false);
  });

  it('fails on an HTTP error without creating a file', async () => {
    await expect(
      downloadInstaller(asset, dir, serving(Buffer.from('Not found'), 404))
    ).rejects.toThrow('HTTP 404');
    expect(existsSync(path.join(dir, asset.name))).toBe(false);
  });
});
