import type {
  Platform,
  UpdateCheckResult,
  UpdateInstallResult,
  UpdateStatus,
} from '@shared/types';
import { VerificationError } from './installer';
import { LATEST_RELEASE_API, installerFor, parseRelease } from './release';
import type { Release, ReleaseAsset } from './release';
import { isNewerVersion } from './version';

export interface UpdateSettings {
  checkAutomatically: boolean;
  /** Version the user chose not to hear about again */
  skippedVersion?: string;
}

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = {
  checkAutomatically: true,
};

interface UpdaterOptions {
  currentVersion: string;
  platform: Platform;
  arch: string;
  initial: UpdateSettings;
  save: (settings: UpdateSettings) => void;
  openExternal: (url: string) => Promise<void>;
  /** Downloads and verifies an installer, returning its path */
  download: (asset: ReleaseAsset) => Promise<string>;
  /** Runs the installer and quits (in dev: shows it in its folder) */
  launch: (file: string) => void;
  fetch?: typeof globalThis.fetch;
}

/**
 * Knows whether a newer release exists and acts on it. Only URLs from the
 * release it fetched and validated itself are ever opened or downloaded.
 */
export const createUpdater = ({
  currentVersion,
  platform,
  arch,
  initial,
  save,
  openExternal,
  download,
  launch,
  fetch = globalThis.fetch,
}: UpdaterOptions) => {
  let settings = initial;
  let release: Release | undefined;
  let isChecking = false;
  let isInstalling = false;

  const update = (patch: Partial<UpdateSettings>) => {
    settings = { ...settings, ...patch };
    save(settings);
  };

  const installer = () => release && installerFor(release, platform, arch);

  const status = (): UpdateStatus => {
    const asset = installer();
    return {
      currentVersion,
      checkAutomatically: settings.checkAutomatically,
      isChecking,
      isInstalling,
      available: release && {
        version: release.version,
        size: asset?.size,
        canInstall: platform === 'win32' && asset !== undefined,
      },
    };
  };

  const fetchLatest = async (): Promise<Release | undefined> => {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    return parseRelease(await response.json());
  };

  const check = async ({ isManual }: { isManual: boolean }) => {
    if (isChecking) return 'failed' satisfies UpdateCheckResult;
    isChecking = true;
    try {
      const latest = await fetchLatest();
      const isNewer =
        latest !== undefined && isNewerVersion(latest.version, currentVersion);
      const isSkipped = latest?.version === settings.skippedVersion;
      release = isNewer && (isManual || !isSkipped) ? latest : undefined;
      return release ? 'available' : 'up-to-date';
    } catch {
      // Offline or GitHub unavailable: try again on the next check
      return 'failed';
    } finally {
      isChecking = false;
    }
  };

  return {
    status,

    check: (): Promise<UpdateCheckResult> => check({ isManual: true }),

    /** Periodic check; does nothing when the user turned it off */
    checkInBackground: async (): Promise<void> => {
      if (settings.checkAutomatically) await check({ isManual: false });
    },

    install: async (): Promise<UpdateInstallResult> => {
      const asset = installer();
      if (platform !== 'win32' || !asset || isInstalling) return 'failed';
      isInstalling = true;
      try {
        launch(await download(asset));
        return 'started';
      } catch (error) {
        return error instanceof VerificationError
          ? 'verification-failed'
          : 'failed';
      } finally {
        isInstalling = false;
      }
    },

    openDownload: async (): Promise<void> => {
      const url = installer()?.url ?? release?.notesUrl;
      if (url) await openExternal(url);
    },

    openNotes: async (): Promise<void> => {
      if (release) await openExternal(release.notesUrl);
    },

    skip: (): UpdateStatus => {
      if (release) update({ skippedVersion: release.version });
      release = undefined;
      return status();
    },

    setAutomatic: (checkAutomatically: boolean): UpdateStatus => {
      update({ checkAutomatically });
      return status();
    },
  };
};

export type Updater = ReturnType<typeof createUpdater>;
