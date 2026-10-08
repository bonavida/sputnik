const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;

interface Version {
  parts: [number, number, number];
  isPrerelease: boolean;
}

export const parseVersion = (text: string): Version | undefined => {
  const match = SEMVER.exec(text.trim());
  if (!match) return undefined;
  const [, major, minor, patch, prerelease] = match;
  return {
    parts: [Number(major), Number(minor), Number(patch)],
    isPrerelease: prerelease !== undefined,
  };
};

/**
 * True when `candidate` is a stable release newer than `current`. Prereleases
 * are never offered; a prerelease build (2.0.0-alpha.0) is older than its
 * stable version (2.0.0).
 */
export const isNewerVersion = (candidate: string, current: string): boolean => {
  const next = parseVersion(candidate);
  const installed = parseVersion(current);
  if (!next || next.isPrerelease || !installed) return false;
  const difference = next.parts
    .map((part, index) => part - (installed.parts[index] ?? 0))
    .find((delta) => delta !== 0);
  if (difference !== undefined) return difference > 0;
  return installed.isPrerelease;
};
