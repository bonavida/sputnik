import { create } from 'zustand';
import type { RepeatMode, Track } from '@shared/types';
import type { Queue, QueueEntry, Random } from '@/utils/queue';
import {
  EMPTY_QUEUE,
  addEntries,
  createQueue,
  cycleRepeat,
  moveEntry,
  neighborAfterRemoval,
  nextUid,
  playEntry,
  previousUid,
  removeEntries,
  setShuffle,
} from '@/utils/queue';

/** Playing for less than this, «previous» goes to the previous track instead of restarting */
export const RESTART_THRESHOLD_SECONDS = 3;
export const SEEK_STEP_SECONDS = 5;
const UNMUTE_VOLUME = 0.5;

export type Status = 'idle' | 'playing' | 'paused';

interface PlayerState {
  queue: Queue;
  status: Status;
  /** Seconds, updated by the audio engine ~4 times per second */
  position: number;
  /** Seconds, from the audio element once loaded (more accurate than tags) */
  duration: number;
  volume: number;
  muted: boolean;
  selectedUid?: string;
  /** Track ids the audio element could not play */
  unplayable: string[];
  /** Changes whenever the current track must (re)start from the beginning */
  playToken: number;
  seekRequest: { time: number; token: number };
}

interface PlayerActions {
  addTracks: (tracks: Track[]) => void;
  replaceQueue: (tracks: Track[], currentIndex?: number) => void;
  markUnplayable: (trackIds: string[]) => void;
  remove: (uids: string[]) => void;
  removeSelected: () => void;
  move: (fromUid: string, toUid: string) => void;
  /** Keyboard alternative to drag and drop */
  moveSelected: (offset: 1 | -1) => void;
  select: (uid: string | undefined) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  playUid: (uid: string) => void;
  playSelected: () => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackOptions: (options: {
    volume: number;
    muted: boolean;
    shuffle: boolean;
    repeat: RepeatMode;
  }) => void;
  // Called by the audio engine
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlaybackChange: (isPlaying: boolean) => void;
  onEnded: () => void;
  onError: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

let random: Random = Math.random;

/** Tests pass a seeded generator so shuffles are reproducible */
export const setRandomSource = (source: Random): void => {
  random = source;
};

const createUid = () => crypto.randomUUID();

const toEntries = (tracks: Track[]): QueueEntry[] =>
  tracks.map((track) => ({ uid: createUid(), track }));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const currentEntry = ({ queue }: PlayerState): QueueEntry | undefined =>
  queue.entries.find(({ uid }) => uid === queue.currentUid);

export const currentTrack = (state: PlayerState): Track | undefined =>
  currentEntry(state)?.track;

const INITIAL_STATE: PlayerState = {
  queue: EMPTY_QUEUE,
  status: 'idle',
  position: 0,
  duration: 0,
  volume: 1,
  muted: false,
  unplayable: [],
  playToken: 0,
  seekRequest: { time: 0, token: 0 },
};

export const usePlayerStore = create<PlayerStore>()((set, get) => {
  const isPlayable = (uid: string) => {
    const entry = get().queue.entries.find(
      (candidate) => candidate.uid === uid
    );
    return Boolean(entry) && !get().unplayable.includes(entry?.track.id ?? '');
  };

  /** Makes `uid` the current track and starts it from the beginning */
  const start = (queue: Queue, uid: string, status: Status) => {
    const state = get();
    const track = queue.entries.find((entry) => entry.uid === uid)?.track;
    set({
      queue: { ...queue, currentUid: uid },
      status,
      position: 0,
      duration: track?.duration ?? 0,
      playToken: state.playToken + 1,
    });
  };

  const restart = () => get().seek(0);

  /** Stops on the current track at 0:00, keeping it visible (R13) */
  const stopAtCurrent = () => {
    set({ status: 'paused' });
    restart();
  };

  const select = (offset: 1 | -1) => {
    const { queue, selectedUid } = get();
    const { entries } = queue;
    if (entries.length === 0) return;
    const index = entries.findIndex(({ uid }) => uid === selectedUid);
    const fallback = offset === 1 ? 0 : entries.length - 1;
    const target =
      index === -1 ? fallback : clamp(index + offset, 0, entries.length - 1);
    set({ selectedUid: entries[target]?.uid });
  };

  return {
    ...INITIAL_STATE,

    addTracks: (tracks) =>
      set(({ queue }) => ({
        queue: addEntries(queue, toEntries(tracks), random),
      })),

    replaceQueue: (tracks, currentIndex) => {
      const { queue, playToken } = get();
      const entries = toEntries(tracks);
      const current =
        currentIndex === undefined ? undefined : entries[currentIndex];
      set({
        queue: createQueue(
          entries,
          {
            currentUid: current?.uid,
            shuffle: queue.shuffle,
            repeat: queue.repeat,
          },
          random
        ),
        status: current ? 'paused' : 'idle',
        position: 0,
        duration: current?.track.duration ?? 0,
        selectedUid: undefined,
        playToken: playToken + 1,
      });
    },

    markUnplayable: (trackIds) =>
      set(({ unplayable }) => ({
        unplayable: [...new Set([...unplayable, ...trackIds])],
      })),

    remove: (uids) => {
      const { queue, selectedUid, playToken } = get();
      const updated = removeEntries(queue, uids);
      const removedCurrent = Boolean(queue.currentUid) && !updated.currentUid;
      set({
        queue: updated,
        selectedUid:
          selectedUid && uids.includes(selectedUid) ? undefined : selectedUid,
        ...(removedCurrent && {
          status: 'idle',
          position: 0,
          duration: 0,
          playToken: playToken + 1,
        }),
      });
    },

    removeSelected: () => {
      const { queue, selectedUid } = get();
      if (!selectedUid) return;
      const neighbor = neighborAfterRemoval(queue.entries, selectedUid);
      get().remove([selectedUid]);
      set({ selectedUid: neighbor });
    },

    move: (fromUid, toUid) =>
      set(({ queue }) => ({ queue: moveEntry(queue, fromUid, toUid) })),

    moveSelected: (offset) => {
      const { queue, selectedUid } = get();
      const index = queue.entries.findIndex(({ uid }) => uid === selectedUid);
      const target = queue.entries[index + offset];
      if (selectedUid && index !== -1 && target)
        get().move(selectedUid, target.uid);
    },

    select: (uid) => set({ selectedUid: uid }),
    selectNext: () => select(1),
    selectPrevious: () => select(-1),

    playUid: (uid) => {
      const { queue, unplayable } = get();
      const entry = queue.entries.find((candidate) => candidate.uid === uid);
      if (!entry) return;
      // Playing an unplayable track explicitly gives it another chance
      set({
        unplayable: unplayable.filter((id) => id !== entry.track.id),
        selectedUid: uid,
      });
      start(playEntry(queue, uid, random), uid, 'playing');
    },

    playSelected: () => {
      const { selectedUid } = get();
      if (selectedUid) get().playUid(selectedUid);
    },

    togglePlay: () => {
      const { status, queue, selectedUid } = get();
      if (status === 'playing') return get().pause();
      if (queue.currentUid) return get().play();
      const first = selectedUid ?? queue.order.find(isPlayable);
      if (first) get().playUid(first);
    },

    play: () => {
      if (get().queue.currentUid) set({ status: 'playing' });
    },

    pause: () => {
      if (get().queue.currentUid) set({ status: 'paused' });
    },

    next: () => {
      const { queue, status } = get();
      const uid = nextUid(queue, { isPlayable });
      if (uid) start(queue, uid, status);
    },

    previous: () => {
      const { queue, status, position } = get();
      if (!queue.currentUid) return;
      const uid =
        position >= RESTART_THRESHOLD_SECONDS
          ? undefined
          : previousUid(queue, { isPlayable });
      if (uid) start(queue, uid, status);
      else restart();
    },

    seek: (time) => {
      const { duration, seekRequest, queue } = get();
      if (!queue.currentUid) return;
      const target = clamp(time, 0, duration || Number.POSITIVE_INFINITY);
      set({
        position: target,
        seekRequest: { time: target, token: seekRequest.token + 1 },
      });
    },

    seekBy: (delta) => get().seek(get().position + delta),

    setVolume: (volume) => {
      const value = clamp(volume, 0, 1);
      set(({ muted }) => ({ volume: value, muted: value > 0 ? false : muted }));
    },

    toggleMute: () =>
      set(({ muted, volume }) => ({
        muted: !muted,
        volume: muted && volume === 0 ? UNMUTE_VOLUME : volume,
      })),

    toggleShuffle: () =>
      set(({ queue }) => ({
        queue: setShuffle(queue, !queue.shuffle, random),
      })),

    cycleRepeat: () => set(({ queue }) => ({ queue: cycleRepeat(queue) })),

    setPlaybackOptions: ({ volume, muted, shuffle, repeat }) =>
      set(({ queue }) => ({
        volume,
        muted,
        queue: { ...setShuffle(queue, shuffle, random), repeat },
      })),

    onTimeUpdate: (time) => set({ position: time }),

    onDurationChange: (duration) => {
      if (Number.isFinite(duration) && duration > 0) set({ duration });
    },

    onPlaybackChange: (isPlaying) => {
      const { queue, status } = get();
      if (!queue.currentUid) return;
      const next: Status = isPlaying ? 'playing' : 'paused';
      if (next !== status) set({ status: next });
    },

    onEnded: () => {
      const { queue } = get();
      const uid = nextUid(queue, { isAutomatic: true, isPlayable });
      if (uid) start(queue, uid, 'playing');
      else stopAtCurrent();
    },

    onError: () => {
      const state = get();
      const track = currentTrack(state);
      if (!track) return;
      get().markUnplayable([track.id]);
      const uid = nextUid(state.queue, { isPlayable });
      // Skip to the next playable track, or stop if there is none (R7)
      if (uid && state.status === 'playing') start(state.queue, uid, 'playing');
      else set({ status: 'paused' });
    },
  };
});
