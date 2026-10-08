import type { Track } from '@shared/types';
import { bridge } from '@/bridge/bridge';
import { useLastfmStore } from '@/stores/lastfmStore';
import type { PlayerStore } from '@/stores/playerStore';
import { currentTrack, usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import {
  listenTarget,
  listenedBetween,
  toScrobbleTrack,
} from '@/utils/scrobble';

const lastfm = () => useLastfmStore.getState();

export const loadLastfmStatus = async (): Promise<void> => {
  try {
    lastfm().setStatus(await bridge().lastfmStatus());
  } catch {
    // Without a status the feature stays hidden; playback is unaffected
  }
};

export const connectLastfm = async (): Promise<void> => {
  const ui = useUiStore.getState();
  lastfm().setConnecting(true);
  try {
    const result = await bridge().lastfmConnect();
    const status = await bridge().lastfmStatus();
    lastfm().setStatus(status);
    if (result === 'connected' && status.user)
      ui.showNotice({ kind: 'lastfmConnected', user: status.user });
    if (result === 'timed-out' || result === 'failed')
      ui.showNotice({ kind: 'lastfmFailed', reason: result });
  } catch {
    ui.showNotice({ kind: 'lastfmFailed', reason: 'failed' });
  } finally {
    lastfm().setConnecting(false);
  }
};

export const cancelLastfmConnect = (): void => {
  void bridge().lastfmCancelConnect();
};

export const disconnectLastfm = async (): Promise<void> => {
  lastfm().setStatus(await bridge().lastfmDisconnect());
};

export const setScrobbling = async (isEnabled: boolean): Promise<void> => {
  lastfm().setStatus(await bridge().lastfmSetEnabled(isEnabled));
};

/** One play of a song: replaying it (or repeat one) starts a new listen */
interface Listen {
  startedAt: number;
  listened: number;
  isScrobbled: boolean;
}

// The audio element knows the real length; metadata is the fallback
const durationOf = (state: PlayerStore, track: Track) =>
  state.duration > 0 ? state.duration : track.duration;

const ignoreErrors = () => undefined;

/**
 * Follows playback and tells Last.fm what is playing and what was listened to.
 * Listening time only grows during normal playback, so seeking to the end of a
 * song does not scrobble it. Returns a function that stops it.
 */
export const startScrobbling = (): (() => void) => {
  let listen: Listen | undefined;

  return usePlayerStore.subscribe((state, previous) => {
    if (state.playToken !== previous.playToken) listen = undefined;

    const { user, isEnabled } = lastfm().status;
    const track = currentTrack(state);
    if (!user || !isEnabled || state.status !== 'playing' || !track) return;

    const duration = durationOf(state, track);
    const scrobbleTrack = toScrobbleTrack(track, duration);
    if (!scrobbleTrack) return;

    if (!listen) {
      listen = {
        startedAt: Math.floor(Date.now() / 1000),
        listened: 0,
        isScrobbled: false,
      };
      void bridge().lastfmNowPlaying(scrobbleTrack).catch(ignoreErrors);
      return;
    }

    if (listen.isScrobbled) return;
    listen.listened += listenedBetween(previous.position, state.position);
    const target = listenTarget(duration);
    if (target === undefined || listen.listened < target) return;

    listen.isScrobbled = true;
    void bridge()
      .lastfmScrobble({ ...scrobbleTrack, timestamp: listen.startedAt })
      .catch(ignoreErrors);
  });
};
