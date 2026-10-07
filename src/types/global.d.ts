import type { SputnikApi } from '@shared/types';

declare global {
  interface Window {
    /** Exposed by electron/preload.ts; missing in the browser demo */
    sputnik?: SputnikApi;
  }
}
