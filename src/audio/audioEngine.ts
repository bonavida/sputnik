import type { Track } from '@shared/types';
import type { PlayerStore } from '@/stores/playerStore';
import { currentTrack, usePlayerStore } from '@/stores/playerStore';

/** The parts of HTMLAudioElement the engine uses; tests pass a fake */
export interface AudioLike {
  src: string;
  currentTime: number;
  readonly duration: number;
  volume: number;
  muted: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export type MediaSessionLike = Pick<
  MediaSession,
  'metadata' | 'playbackState' | 'setActionHandler'
> &
  Partial<Pick<MediaSession, 'setPositionState'>>;

interface AudioEngineOptions {
  audio: AudioLike;
  mediaUrl: (trackId: string) => string;
  mediaSession?: MediaSessionLike;
}

const MEDIA_ACTIONS = [
  'play',
  'pause',
  'stop',
  'previoustrack',
  'nexttrack',
  'seekto',
] as const;

const toMetadata = ({
  title,
  artist,
  album,
  coverUrl,
}: Track): MediaMetadataInit => ({
  title,
  artist: artist ?? '',
  album: album ?? '',
  artwork: coverUrl ? [{ src: coverUrl }] : [],
});

const player = () => usePlayerStore.getState();

const playbackStateOf = (state: PlayerStore): MediaSessionPlaybackState => {
  if (!currentTrack(state)) return 'none';
  return state.status === 'playing' ? 'playing' : 'paused';
};

/**
 * Keeps a single <audio> element in sync with the player store, outside React:
 * the store says what should happen and the engine reports what did happen.
 * Returns a function that disconnects it.
 */
export const createAudioEngine = ({
  audio,
  mediaUrl,
  mediaSession,
}: AudioEngineOptions): (() => void) => {
  const load = (track: Track | undefined) => {
    if (!track) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    audio.src = mediaUrl(track.id);
    audio.currentTime = 0;
  };

  const applyStatus = (state: PlayerStore) => {
    if (state.status !== 'playing') {
      audio.pause();
      return;
    }
    audio.play().catch((error: unknown) => {
      // AbortError: a newer load interrupted this play() call, which is expected
      if (error instanceof DOMException && error.name === 'AbortError') return;
      player().onError();
    });
  };

  const updateMediaSession = (state: PlayerStore) => {
    if (mediaSession) mediaSession.playbackState = playbackStateOf(state);
  };

  const updateMetadata = (track: Track | undefined) => {
    if (!mediaSession) return;
    const init = track && toMetadata(track);
    mediaSession.metadata =
      init && typeof MediaMetadata !== 'undefined'
        ? new MediaMetadata(init)
        : null;
  };

  const updatePosition = () => {
    const { duration, position } = player();
    if (!mediaSession?.setPositionState || !(duration > 0)) return;
    try {
      mediaSession.setPositionState({
        duration,
        position: Math.min(position, duration),
        playbackRate: 1,
      });
    } catch {
      // Throws on transient invalid values (e.g. while the duration is unknown)
    }
  };

  const unsubscribe = usePlayerStore.subscribe((state, previous) => {
    const track = currentTrack(state);
    if (state.playToken !== previous.playToken) {
      load(track);
      updateMetadata(track);
    }
    if (
      state.playToken !== previous.playToken ||
      state.status !== previous.status
    ) {
      applyStatus(state);
      updateMediaSession(state);
    }
    if (state.seekRequest !== previous.seekRequest) {
      audio.currentTime = state.seekRequest.time;
      updatePosition();
    }
    if (state.volume !== previous.volume) audio.volume = state.volume;
    if (state.muted !== previous.muted) audio.muted = state.muted;
  });

  const listeners: Record<string, () => void> = {
    timeupdate: () => player().onTimeUpdate(audio.currentTime),
    durationchange: () => {
      player().onDurationChange(audio.duration);
      updatePosition();
    },
    ended: () => player().onEnded(),
    error: () => {
      // Clearing the source on purpose is not an error
      if (currentTrack(player())) player().onError();
    },
    // Playback can also change from the OS media controls
    play: () => player().onPlaybackChange(true),
    pause: () => player().onPlaybackChange(false),
  };
  Object.entries(listeners).forEach(([event, listener]) =>
    audio.addEventListener(event, listener)
  );

  const actions: Record<
    (typeof MEDIA_ACTIONS)[number],
    MediaSessionActionHandler
  > = {
    play: () => player().play(),
    pause: () => player().pause(),
    stop: () => player().pause(),
    previoustrack: () => player().previous(),
    nexttrack: () => player().next(),
    seekto: ({ seekTime }) => {
      if (seekTime !== undefined) player().seek(seekTime);
    },
  };
  MEDIA_ACTIONS.forEach((action) =>
    mediaSession?.setActionHandler(action, actions[action])
  );

  // Bring the element up to date with whatever the store already holds
  const initial = player();
  audio.volume = initial.volume;
  audio.muted = initial.muted;
  load(currentTrack(initial));
  updateMetadata(currentTrack(initial));
  updateMediaSession(initial);

  return () => {
    unsubscribe();
    Object.entries(listeners).forEach(([event, listener]) =>
      audio.removeEventListener(event, listener)
    );
    MEDIA_ACTIONS.forEach((action) =>
      mediaSession?.setActionHandler(action, null)
    );
    audio.pause();
  };
};
