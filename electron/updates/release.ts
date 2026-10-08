import { GITHUB_REPO } from '@shared/constants';
import { isRecord } from '@shared/guards';
import type { Platform } from '@shared/types';
import { parseVersion } from './version';

export const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
// Anything else in the API response (another repo, another host) is ignored
const RELEASE_PAGE_PREFIX = `https://github.com/${GITHUB_REPO}/releases/`;
const DOWNLOAD_PREFIX = `${RELEASE_PAGE_PREFIX}download/`;
const ASSET_NAME = /^[\w.-]+$/;
const SHA256 = /^sha256:([0-9a-f]{64})$/;

export interface ReleaseAsset {
  name: string;
  url: string;
  /** Bytes */
  size: number;
  /** Hex digest published by GitHub */
  sha256: string;
}

export interface Release {
  /** Without the leading "v" */
  version: string;
  notesUrl: string;
  assets: ReleaseAsset[];
}

const toAsset = (value: unknown): ReleaseAsset[] => {
  if (!isRecord(value)) return [];
  const { name, browser_download_url: url, size, digest } = value;
  const sha256 =
    typeof digest === 'string' ? SHA256.exec(digest)?.[1] : undefined;
  if (
    typeof name !== 'string' ||
    !ASSET_NAME.test(name) ||
    typeof url !== 'string' ||
    !url.startsWith(DOWNLOAD_PREFIX) ||
    typeof size !== 'number' ||
    !sha256
  )
    return [];
  return [{ name, url, size, sha256 }];
};

/** Reads GitHub's "latest release" response; undefined if it is not usable */
export const parseRelease = (data: unknown): Release | undefined => {
  if (!isRecord(data) || data.draft || data.prerelease) return undefined;
  const { tag_name: tag, html_url: notesUrl, assets } = data;
  if (typeof tag !== 'string' || !parseVersion(tag)) return undefined;
  if (typeof notesUrl !== 'string' || !notesUrl.startsWith(RELEASE_PAGE_PREFIX))
    return undefined;
  return {
    version: tag.replace(/^v/, ''),
    notesUrl,
    assets: Array.isArray(assets) ? assets.flatMap(toAsset) : [],
  };
};

/** File name endings from electron-builder.json, per platform and CPU */
const INSTALLER_SUFFIX: Record<Platform, Partial<Record<string, string>>> = {
  win32: { x64: '-setup.exe', arm64: '-setup.exe' },
  darwin: { arm64: '-arm64.dmg', x64: '-x64.dmg' },
  linux: { x64: '-x86_64.AppImage' },
};

export const installerFor = (
  { assets }: Release,
  platform: Platform,
  arch: string
): ReleaseAsset | undefined => {
  const suffix = INSTALLER_SUFFIX[platform][arch];
  return suffix ? assets.find(({ name }) => name.endsWith(suffix)) : undefined;
};
