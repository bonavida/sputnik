import { describe, expect, it } from 'vitest';
import { installerFor, parseRelease } from '../release';

const DOWNLOAD = 'https://github.com/bonavida/sputnik/releases/download/v2.2.0';
const SHA = 'a'.repeat(64);

const asset = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  browser_download_url: `${DOWNLOAD}/${name}`,
  size: 1000,
  digest: `sha256:${SHA}`,
  ...overrides,
});

const response = (overrides: Record<string, unknown> = {}) => ({
  tag_name: 'v2.2.0',
  html_url: 'https://github.com/bonavida/sputnik/releases/tag/v2.2.0',
  draft: false,
  prerelease: false,
  assets: [
    asset('Sputnik-2.2.0-setup.exe'),
    asset('Sputnik-2.2.0-arm64.dmg'),
    asset('Sputnik-2.2.0-x64.dmg'),
    asset('Sputnik-2.2.0-x86_64.AppImage'),
    asset('Sputnik-2.2.0-amd64.deb'),
  ],
  ...overrides,
});

describe('parseRelease', () => {
  it('reads the version, the notes page and the installers', () => {
    const release = parseRelease(response());

    expect(release?.version).toBe('2.2.0');
    expect(release?.notesUrl).toBe(
      'https://github.com/bonavida/sputnik/releases/tag/v2.2.0'
    );
    expect(release?.assets).toHaveLength(5);
    expect(release?.assets[0]).toEqual({
      name: 'Sputnik-2.2.0-setup.exe',
      url: `${DOWNLOAD}/Sputnik-2.2.0-setup.exe`,
      size: 1000,
      sha256: SHA,
    });
  });

  it('only accepts downloads from this repository on github.com', () => {
    const release = parseRelease(
      response({
        assets: [
          asset('Sputnik-2.2.0-setup.exe', {
            browser_download_url:
              'https://evil.example/Sputnik-2.2.0-setup.exe',
          }),
          asset('Sputnik-2.2.0-x64.dmg', {
            browser_download_url:
              'https://github.com/someone/else/releases/download/v2.2.0/Sputnik-2.2.0-x64.dmg',
          }),
          asset('Sputnik-2.2.0-arm64.dmg', {
            browser_download_url: `${DOWNLOAD.replace('https', 'http')}/Sputnik-2.2.0-arm64.dmg`,
          }),
        ],
      })
    );

    expect(release?.assets).toEqual([]);
  });

  it('ignores installers without a SHA-256 digest or with a strange name', () => {
    const release = parseRelease(
      response({
        assets: [
          asset('Sputnik-2.2.0-setup.exe', { digest: undefined }),
          asset('Sputnik-2.2.0-x64.dmg', { digest: 'md5:abc' }),
          asset('../../Sputnik-2.2.0-arm64.dmg'),
        ],
      })
    );

    expect(release?.assets).toEqual([]);
  });

  it.each([
    ['a draft', { draft: true }],
    ['a prerelease', { prerelease: true }],
    ['a tag that is not a version', { tag_name: 'nightly' }],
    ['a notes page elsewhere', { html_url: 'https://evil.example/notes' }],
  ])('rejects %s', (_, overrides) => {
    expect(parseRelease(response(overrides))).toBeUndefined();
  });

  it('rejects an error response', () => {
    expect(parseRelease({ message: 'Not Found' })).toBeUndefined();
  });
});

describe('installerFor', () => {
  const release = parseRelease(response());
  if (!release) throw new Error('fixture');

  it.each([
    ['win32', 'x64', 'Sputnik-2.2.0-setup.exe'],
    ['darwin', 'arm64', 'Sputnik-2.2.0-arm64.dmg'],
    ['darwin', 'x64', 'Sputnik-2.2.0-x64.dmg'],
    ['linux', 'x64', 'Sputnik-2.2.0-x86_64.AppImage'],
  ] as const)('picks the installer for %s %s', (platform, arch, name) => {
    expect(installerFor(release, platform, arch)?.name).toBe(name);
  });

  it('has nothing for platforms without a build', () => {
    expect(installerFor(release, 'linux', 'arm64')).toBeUndefined();
  });
});
