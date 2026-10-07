import type { AudioLike, MediaSessionLike } from '@/audio/audioEngine';

/**
 * Stand-in for HTMLAudioElement (jsdom cannot play media). Tests drive it with
 * the simulation methods, wrapped in act() because they update the stores.
 */
export class FakeAudio implements AudioLike {
  src = '';
  currentTime = 0;
  duration = Number.NaN;
  paused = true;
  volume = 1;
  muted = false;
  playCalls = 0;
  /** Makes the next play() reject, like Chromium does with unsupported codecs */
  rejectNextPlay?: Error;

  private readonly listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    const error = this.rejectNextPlay;
    this.rejectNextPlay = undefined;
    if (error) return Promise.reject(error);
    if (this.paused) {
      this.paused = false;
      this.emit('play');
    }
    return Promise.resolve();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.emit('pause');
  }

  load(): void {}

  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }

  // Simulations of what the browser would do

  loaded(duration: number): void {
    this.duration = duration;
    this.emit('durationchange');
  }

  progress(time: number): void {
    this.currentTime = time;
    this.emit('timeupdate');
  }

  /** The track played to the end: the browser pauses, then fires `ended` */
  finish(): void {
    this.paused = true;
    this.emit('pause');
    this.emit('ended');
  }

  fail(): void {
    this.emit('error');
  }

  private emit(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

export interface FakeMediaSession extends MediaSessionLike {
  handlers: Map<MediaSessionAction, MediaSessionActionHandler>;
}

export const createFakeMediaSession = (): FakeMediaSession => {
  const handlers = new Map<MediaSessionAction, MediaSessionActionHandler>();
  return {
    metadata: null,
    playbackState: 'none',
    handlers,
    setActionHandler: (action, handler) => {
      if (handler) handlers.set(action, handler);
      else handlers.delete(action);
    },
  };
};
