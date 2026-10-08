import { describe, expect, it, vi } from 'vitest';
import type { Platform } from '@shared/types';
import { VerificationError } from '../installer';
import type { ReleaseAsset } from '../release';
import { DEFAULT_UPDATE_SETTINGS, createUpdater } from '../updater';
import type { UpdateSettings } from '../updater';

const DOWNLOAD = 'https://github.com/bonavida/sputnik/releases/download/v2.2.0';
const NOTES = 'https://github.com/bonavida/sputnik/releases/tag/v2.2.0';

const latest = (tag = 'v2.2.0') => ({
  tag_name: tag,
  html_url: NOTES,
  draft: false,
  prerelease: false,
  assets: ['setup.exe', 'arm64.dmg', 'x64.dmg', 'x86_64.AppImage'].map(
    (suffix) => ({
      name: `Sputnik-2.2.0-${suffix}`,
      browser_download_url: `${DOWNLOAD}/Sputnik-2.2.0-${suffix}`,
      size: 86_000_000,
      digest: `sha256:${'b'.repeat(64)}`,
    })
  ),
});

const github = (body: unknown = latest(), status = 200) =>
  vi.fn<typeof fetch>(async () => Response.json(body, { status }));

const setup = ({
  platform = 'win32' as Platform,
  arch = 'x64',
  currentVersion = '2.1.0',
  initial = DEFAULT_UPDATE_SETTINGS as UpdateSettings,
  fetch = github(),
  download = vi.fn<(asset: ReleaseAsset) => Promise<string>>(
    async ({ name }) => `C:\\Temp\\${name}`
  ),
} = {}) => {
  const saved: UpdateSettings[] = [];
  const openExternal = vi.fn<(url: string) => Promise<void>>(
    async () => undefined
  );
  const launch = vi.fn<(file: string) => void>();
  const updater = createUpdater({
    currentVersion,
    platform,
    arch,
    initial,
    save: (settings) => saved.push(settings),
    openExternal,
    download,
    launch,
    fetch,
  });
  return { updater, saved, openExternal, launch, download, fetch };
};

describe('checking for updates', () => {
  it('finds a newer release', async () => {
    const { updater } = setup();

    expect(await updater.check()).toBe('available');
    expect(updater.status()).toMatchObject({
      currentVersion: '2.1.0',
      available: { version: '2.2.0', size: 86_000_000, canInstall: true },
    });
  });

  it('says the app is up to date on the latest version', async () => {
    const { updater } = setup({ currentVersion: '2.2.0' });

    expect(await updater.check()).toBe('up-to-date');
    expect(updater.status().available).toBeUndefined();
  });

  it('fails quietly when offline or GitHub is down', async () => {
    const offline = setup({
      fetch: vi.fn<typeof fetch>(async () => {
        throw new TypeError('fetch failed');
      }),
    });
    expect(await offline.updater.check()).toBe('failed');

    const rateLimited = setup({
      fetch: github({ message: 'rate limit' }, 403),
    });
    expect(await rateLimited.updater.check()).toBe('failed');
  });

  it('only installs by itself on Windows; elsewhere it offers the download', async () => {
    const mac = setup({ platform: 'darwin', arch: 'arm64' });
    await mac.updater.check();
    expect(mac.updater.status().available?.canInstall).toBe(false);

    await mac.updater.openDownload();
    expect(mac.openExternal).toHaveBeenCalledWith(
      `${DOWNLOAD}/Sputnik-2.2.0-arm64.dmg`
    );
  });

  it('sends to the release page when there is no installer for this system', async () => {
    const { updater, openExternal } = setup({
      platform: 'linux',
      arch: 'arm64',
    });
    await updater.check();

    expect(updater.status().available?.size).toBeUndefined();
    await updater.openDownload();
    expect(openExternal).toHaveBeenCalledWith(NOTES);
  });
});

describe('skipping and automatic checks', () => {
  it('does not mention a skipped version again in the background', async () => {
    const { updater, saved } = setup();
    await updater.check();

    updater.skip();
    expect(saved.at(-1)?.skippedVersion).toBe('2.2.0');
    expect(updater.status().available).toBeUndefined();

    await updater.checkInBackground();
    expect(updater.status().available).toBeUndefined();
  });

  it('still shows a skipped version when the user checks by hand', async () => {
    const { updater } = setup({
      initial: { checkAutomatically: true, skippedVersion: '2.2.0' },
    });

    expect(await updater.check()).toBe('available');
  });

  it('tells about a newer version than the skipped one', async () => {
    const { updater } = setup({
      initial: { checkAutomatically: true, skippedVersion: '2.1.5' },
    });

    await updater.checkInBackground();
    expect(updater.status().available?.version).toBe('2.2.0');
  });

  it('does not contact GitHub in the background when turned off', async () => {
    const { updater, fetch } = setup();

    updater.setAutomatic(false);
    await updater.checkInBackground();

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('installing on Windows', () => {
  it('downloads the installer and runs it', async () => {
    const { updater, download, launch } = setup();
    await updater.check();

    expect(await updater.install()).toBe('started');
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sputnik-2.2.0-setup.exe' })
    );
    expect(launch).toHaveBeenCalledWith('C:\\Temp\\Sputnik-2.2.0-setup.exe');
  });

  it('never runs an installer that fails verification', async () => {
    const { updater, launch } = setup({
      download: vi.fn<(asset: ReleaseAsset) => Promise<string>>(async () => {
        throw new VerificationError('Sputnik-2.2.0-setup.exe');
      }),
    });
    await updater.check();

    expect(await updater.install()).toBe('verification-failed');
    expect(launch).not.toHaveBeenCalled();
    expect(updater.status().isInstalling).toBe(false);
  });

  it('cannot install without a known update', async () => {
    const { updater, download } = setup();

    expect(await updater.install()).toBe('failed');
    expect(download).not.toHaveBeenCalled();
  });
});
