import type { RepeatMode, Track } from '@shared/types';

/** A track placed in the queue. The same track can appear twice with different uids */
export interface QueueEntry {
  uid: string;
  track: Track;
}

export interface Queue {
  /** Visible order */
  entries: QueueEntry[];
  /** Play order as uids: the visible order, or a permutation while shuffling */
  order: string[];
  currentUid?: string;
  shuffle: boolean;
  repeat: RepeatMode;
}

export type Random = () => number;

interface StepOptions {
  /** True when the track ended on its own: repeat one replays it */
  isAutomatic?: boolean;
  isPlayable?: (uid: string) => boolean;
}

export const EMPTY_QUEUE: Queue = {
  entries: [],
  order: [],
  shuffle: false,
  repeat: 'off',
};

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = {
  off: 'all',
  all: 'one',
  one: 'off',
};

const uidsOf = (entries: readonly QueueEntry[]) =>
  entries.map(({ uid }) => uid);

const alwaysPlayable = () => true;

/** Unbiased Fisher–Yates shuffle (the old `sort(() => Math.random() - 0.5)` was biased) */
export const shuffled = <Item>(
  items: readonly Item[],
  random: Random
): Item[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [
      result[swap] as Item,
      result[index] as Item,
    ];
  }
  return result;
};

const shuffledOrder = (
  uids: string[],
  firstUid: string | undefined,
  random: Random
) => {
  if (!firstUid || !uids.includes(firstUid)) return shuffled(uids, random);
  return [
    firstUid,
    ...shuffled(
      uids.filter((uid) => uid !== firstUid),
      random
    ),
  ];
};

export const createQueue = (
  entries: QueueEntry[],
  {
    currentUid,
    shuffle,
    repeat,
  }: Pick<Queue, 'currentUid' | 'shuffle' | 'repeat'>,
  random: Random
): Queue => ({
  entries,
  order: shuffle
    ? shuffledOrder(uidsOf(entries), currentUid, random)
    : uidsOf(entries),
  currentUid: entries.some(({ uid }) => uid === currentUid)
    ? currentUid
    : undefined,
  shuffle,
  repeat,
});

export const setShuffle = (
  queue: Queue,
  shuffle: boolean,
  random: Random
): Queue => ({
  ...queue,
  shuffle,
  order: shuffle
    ? shuffledOrder(uidsOf(queue.entries), queue.currentUid, random)
    : uidsOf(queue.entries),
});

export const cycleRepeat = (queue: Queue): Queue => ({
  ...queue,
  repeat: REPEAT_CYCLE[queue.repeat],
});

export const addEntries = (
  queue: Queue,
  added: QueueEntry[],
  random: Random
): Queue => {
  const entries = [...queue.entries, ...added];
  if (!queue.shuffle) return { ...queue, entries, order: uidsOf(entries) };

  // Only the upcoming part is reshuffled; what already played keeps its place
  const currentIndex = queue.currentUid
    ? queue.order.indexOf(queue.currentUid)
    : -1;
  const played = queue.order.slice(0, currentIndex + 1);
  const upcoming = [...queue.order.slice(currentIndex + 1), ...uidsOf(added)];
  return {
    ...queue,
    entries,
    order: [...played, ...shuffled(upcoming, random)],
  };
};

export const removeEntries = (queue: Queue, uids: readonly string[]): Queue => {
  const removed = new Set(uids);
  return {
    ...queue,
    entries: queue.entries.filter(({ uid }) => !removed.has(uid)),
    order: queue.order.filter((uid) => !removed.has(uid)),
    currentUid:
      queue.currentUid && removed.has(queue.currentUid)
        ? undefined
        : queue.currentUid,
  };
};

/** Moves an entry to another's position. The current track never changes (R5) */
export const moveEntry = (
  queue: Queue,
  fromUid: string,
  toUid: string
): Queue => {
  const from = queue.entries.findIndex(({ uid }) => uid === fromUid);
  const to = queue.entries.findIndex(({ uid }) => uid === toUid);
  if (from === -1 || to === -1 || from === to) return queue;

  const entries = [...queue.entries];
  const [moved] = entries.splice(from, 1);
  if (!moved) return queue;
  entries.splice(to, 0, moved);
  // While shuffling the play order is independent from the visible one
  return {
    ...queue,
    entries,
    order: queue.shuffle ? queue.order : uidsOf(entries),
  };
};

/** Explicit play: while shuffling, the chosen track starts a new random order */
export const playEntry = (queue: Queue, uid: string, random: Random): Queue => {
  if (!queue.entries.some((entry) => entry.uid === uid)) return queue;
  return {
    ...queue,
    currentUid: uid,
    order: queue.shuffle
      ? shuffledOrder(uidsOf(queue.entries), uid, random)
      : queue.order,
  };
};

const step = (
  queue: Queue,
  direction: 1 | -1,
  isPlayable: (uid: string) => boolean
) => {
  const { order, currentUid, repeat } = queue;
  const start = currentUid ? order.indexOf(currentUid) : -1;
  // Nothing playing: next/previous do nothing (R2)
  if (start === -1) return undefined;

  const wraps = repeat !== 'off';
  // Visit every other track at most once (the current one last when wrapping), so
  // a queue full of unplayable tracks cannot loop forever
  const steps = wraps ? order.length : order.length - 1;
  return Array.from(
    { length: steps },
    (_, offset) => start + direction * (offset + 1)
  )
    .map((index) => (wraps ? (index + order.length) % order.length : index))
    .filter((index) => index >= 0 && index < order.length)
    .map((index) => order[index] as string)
    .find(isPlayable);
};

export const nextUid = (
  queue: Queue,
  { isAutomatic = false, isPlayable = alwaysPlayable }: StepOptions = {}
): string | undefined => {
  const { currentUid, repeat } = queue;
  if (isAutomatic && repeat === 'one' && currentUid && isPlayable(currentUid))
    return currentUid;
  return step(queue, 1, isPlayable);
};

export const previousUid = (
  queue: Queue,
  { isPlayable = alwaysPlayable }: Pick<StepOptions, 'isPlayable'> = {}
): string | undefined => step(queue, -1, isPlayable);

/** Row to select after removing `uid`: the next one, or the previous one at the end */
export const neighborAfterRemoval = (
  entries: readonly QueueEntry[],
  uid: string
): string | undefined => {
  const index = entries.findIndex((entry) => entry.uid === uid);
  if (index === -1) return undefined;
  return (entries[index + 1] ?? entries[index - 1])?.uid;
};
