import type { AudioLike, MediaSessionLike } from '@/audio/audioEngine';
import { createAudioEngine } from '@/audio/audioEngine';
import { bridge } from '@/bridge/bridge';
import { restoreState } from './actions';
import { loadLastfmStatus, startScrobbling } from './lastfm';
import { startPersistence } from './persistence';

interface BootOptions {
  audio: AudioLike;
  mediaSession?: MediaSessionLike;
}

/**
 * Restores the saved state, then starts saving changes and playing audio.
 * Shared by main.tsx and the integration tests. Returns a teardown function.
 */
export const boot = async ({
  audio,
  mediaSession,
}: BootOptions): Promise<() => void> => {
  // A broken state file must never keep the app from opening
  await restoreState().catch(() => undefined);
  await loadLastfmStatus();
  const stopPersistence = startPersistence();
  const stopScrobbling = startScrobbling();
  const stopEngine = createAudioEngine({
    audio,
    mediaUrl: bridge().mediaUrl,
    mediaSession,
  });
  return () => {
    stopEngine();
    stopScrobbling();
    stopPersistence();
  };
};
