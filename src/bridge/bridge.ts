import type { SputnikApi } from '@shared/types';

let override: SputnikApi | undefined;

/** Replaces `window.sputnik` (tests and the browser demo use an in-memory bridge) */
export const setBridge = (api: SputnikApi | undefined): void => {
  override = api;
};

/** Resolved on every call, so importing this module never touches `window` */
export const bridge = (): SputnikApi => {
  const api = override ?? window.sputnik;
  if (!api)
    throw new Error(
      'window.sputnik is missing: run the app with Electron or `pnpm dev:web`'
    );
  return api;
};
