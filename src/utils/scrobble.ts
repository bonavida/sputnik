import type { ScrobbleTrack, Track } from '@shared/types';

/** Last.fm rules: songs of 30 s or less are never scrobbled */
export const MIN_SCROBBLE_DURATION_S = 30;
/** …and a song counts once half of it, or 4 minutes, has been listened to */
export const MAX_LISTEN_TARGET_S = 240;
/**
 * timeupdate fires about four times a second while playing. A bigger jump is a
 * seek, which is not listening.
 */
export const MAX_PLAYBACK_STEP_S = 2;

/** Seconds of listening a song needs to be scrobbled, or undefined if it never will */
export const listenTarget = (duration: number): number | undefined =>
  duration > MIN_SCROBBLE_DURATION_S
    ? Math.min(duration / 2, MAX_LISTEN_TARGET_S)
    : undefined;

/** Listening time between two positions: only steady forward playback counts */
export const listenedBetween = (previous: number, current: number): number => {
  const step = current - previous;
  return step > 0 && step <= MAX_PLAYBACK_STEP_S ? step : 0;
};

/** Undefined for songs Last.fm cannot identify (no artist) */
export const toScrobbleTrack = (
  { artist, title, album }: Track,
  duration: number
): ScrobbleTrack | undefined =>
  artist ? { artist, title, album, duration: Math.round(duration) } : undefined;
