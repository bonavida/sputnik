import { describe, expect, it } from 'vitest';
import type { Track } from '@shared/types';
import type { Queue, QueueEntry } from '../queue';
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
  restoreOrder,
  setShuffle,
  shuffled,
  sortEntries,
} from '../queue';

/** Deterministic pseudo-random generator (LCG) so shuffles are reproducible */
const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
    return state / 2 ** 32;
  };
};

const track = (id: string): Track => ({
  id,
  path: `/${id}.mp3`,
  title: id.toUpperCase(),
  duration: 60,
});
const entry = (uid: string, trackId = uid): QueueEntry => ({
  uid,
  track: track(trackId),
});

const queueOf = (uids: string[], options: Partial<Queue> = {}): Queue => ({
  ...createQueue(
    uids.map((uid) => entry(uid)),
    { shuffle: false, repeat: 'off' },
    seededRandom(1)
  ),
  ...options,
});

const visible = (queue: Queue) => queue.entries.map(({ uid }) => uid);

describe('shuffled', () => {
  it('returns a permutation of the same items', () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    const result = shuffled(items, seededRandom(7));

    expect(result).not.toEqual(items);
    expect(result.toSorted((a, b) => a - b)).toEqual(items);
  });

  it('is deterministic for the same random source', () => {
    expect(shuffled(['a', 'b', 'c', 'd', 'e'], seededRandom(3))).toEqual(
      shuffled(['a', 'b', 'c', 'd', 'e'], seededRandom(3))
    );
  });

  it('does not mutate its input', () => {
    const items = ['a', 'b', 'c'];
    shuffled(items, seededRandom(1));
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

describe('setShuffle', () => {
  it('puts the current track first and shuffles the rest', () => {
    const queue = queueOf(['a', 'b', 'c', 'd', 'e', 'f'], { currentUid: 'c' });

    const result = setShuffle(queue, true, seededRandom(5));

    expect(result.order[0]).toBe('c');
    expect(result.order.toSorted()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(visible(result)).toEqual(visible(queue));
  });

  it('does not insert empty slots when nothing is playing (R3)', () => {
    const result = setShuffle(queueOf(['a', 'b', 'c']), true, seededRandom(2));

    expect(result.order).toHaveLength(3);
    expect(result.order.every((uid) => ['a', 'b', 'c'].includes(uid))).toBe(
      true
    );
  });

  it('restores the visible order when turned off', () => {
    const queue = setShuffle(
      queueOf(['a', 'b', 'c'], { currentUid: 'b' }),
      true,
      seededRandom(9)
    );

    expect(setShuffle(queue, false, seededRandom(9)).order).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('handles an empty queue', () => {
    expect(setShuffle(EMPTY_QUEUE, true, seededRandom(1)).order).toEqual([]);
  });
});

describe('cycleRepeat', () => {
  it('cycles off → all → one → off', () => {
    const modes = [queueOf([])];
    Array.from({ length: 3 }).forEach(() =>
      modes.push(cycleRepeat(modes.at(-1) as Queue))
    );

    expect(modes.map(({ repeat }) => repeat)).toEqual([
      'off',
      'all',
      'one',
      'off',
    ]);
  });
});

describe('nextUid / previousUid', () => {
  it('moves through the play order', () => {
    const queue = queueOf(['a', 'b', 'c'], { currentUid: 'b' });

    expect(nextUid(queue)).toBe('c');
    expect(previousUid(queue)).toBe('a');
  });

  it('does nothing when no track is current (R2)', () => {
    const queue = queueOf(['a', 'b', 'c']);

    expect(nextUid(queue)).toBeUndefined();
    expect(previousUid(queue)).toBeUndefined();
  });

  it('stops at the ends when repeat is off', () => {
    expect(nextUid(queueOf(['a', 'b'], { currentUid: 'b' }))).toBeUndefined();
    expect(
      previousUid(queueOf(['a', 'b'], { currentUid: 'a' }))
    ).toBeUndefined();
  });

  it('wraps around with repeat all, even with a single track', () => {
    expect(
      nextUid(queueOf(['a', 'b'], { currentUid: 'b', repeat: 'all' }))
    ).toBe('a');
    expect(
      previousUid(queueOf(['a', 'b'], { currentUid: 'a', repeat: 'all' }))
    ).toBe('b');
    expect(nextUid(queueOf(['a'], { currentUid: 'a', repeat: 'all' }))).toBe(
      'a'
    );
  });

  it('replays the track when it ends with repeat one, but skips on manual next', () => {
    const queue = queueOf(['a', 'b'], { currentUid: 'a', repeat: 'one' });

    expect(nextUid(queue, { isAutomatic: true })).toBe('a');
    expect(nextUid(queue)).toBe('b');
  });

  it('follows the shuffled order instead of the visible one', () => {
    const queue = queueOf(['a', 'b', 'c'], {
      currentUid: 'a',
      shuffle: true,
      order: ['a', 'c', 'b'],
    });

    expect(nextUid(queue)).toBe('c');
  });

  it('skips unplayable tracks', () => {
    const queue = queueOf(['a', 'b', 'c', 'd'], { currentUid: 'a' });

    expect(
      nextUid(queue, { isPlayable: (uid) => uid !== 'b' && uid !== 'c' })
    ).toBe('d');
    expect(
      previousUid(
        { ...queue, currentUid: 'd' },
        { isPlayable: (uid) => uid !== 'c' }
      )
    ).toBe('b');
  });

  it('gives up instead of looping forever when nothing else can play (R7)', () => {
    const queue = queueOf(['a', 'b', 'c'], { currentUid: 'a', repeat: 'all' });

    expect(nextUid(queue, { isPlayable: () => false })).toBeUndefined();
  });
});

describe('addEntries', () => {
  it('appends to the visible and play orders', () => {
    const result = addEntries(
      queueOf(['a']),
      [entry('b'), entry('c')],
      seededRandom(1)
    );

    expect(visible(result)).toEqual(['a', 'b', 'c']);
    expect(result.order).toEqual(['a', 'b', 'c']);
  });

  it('while shuffling, mixes new tracks only into what has not played yet', () => {
    const queue = queueOf(['a', 'b', 'c', 'd'], {
      currentUid: 'b',
      shuffle: true,
      order: ['d', 'b', 'a', 'c'],
    });

    const result = addEntries(queue, [entry('e'), entry('f')], seededRandom(4));

    expect(result.order.slice(0, 2)).toEqual(['d', 'b']);
    expect(result.order.slice(2).toSorted()).toEqual(['a', 'c', 'e', 'f']);
  });

  it('allows the same track twice with different uids', () => {
    const result = addEntries(
      queueOf(['a']),
      [entry('a2', 'a')],
      seededRandom(1)
    );

    expect(result.entries.map(({ track: { id } }) => id)).toEqual(['a', 'a']);
    expect(result.order).toEqual(['a', 'a2']);
  });
});

describe('removeEntries', () => {
  it('removes from both orders and keeps the current track', () => {
    const result = removeEntries(
      queueOf(['a', 'b', 'c'], { currentUid: 'c' }),
      ['a']
    );

    expect(visible(result)).toEqual(['b', 'c']);
    expect(result.order).toEqual(['b', 'c']);
    expect(result.currentUid).toBe('c');
    expect(nextUid({ ...result, currentUid: 'b' })).toBe('c');
  });

  it('clears the current track when it is removed', () => {
    expect(
      removeEntries(queueOf(['a', 'b'], { currentUid: 'a' }), ['a']).currentUid
    ).toBeUndefined();
  });
});

describe('moveEntry', () => {
  it('reorders without changing the current track and the next one follows the new order (R5)', () => {
    // The old index-based code ended up pointing at the wrong row in this case
    const queue = queueOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], {
      currentUid: 'c',
    });

    const result = moveEntry(queue, 'f', 'h');

    expect(visible(result)).toEqual(['a', 'b', 'c', 'd', 'e', 'g', 'h', 'f']);
    expect(result.currentUid).toBe('c');
    expect(nextUid(moveEntry(queue, 'g', 'd'))).toBe('g');
  });

  it('keeps the shuffled play order untouched', () => {
    const queue = queueOf(['a', 'b', 'c'], {
      currentUid: 'a',
      shuffle: true,
      order: ['a', 'c', 'b'],
    });

    const result = moveEntry(queue, 'c', 'a');

    expect(visible(result)).toEqual(['c', 'a', 'b']);
    expect(result.order).toEqual(['a', 'c', 'b']);
  });

  it('ignores unknown uids', () => {
    const queue = queueOf(['a', 'b']);
    expect(moveEntry(queue, 'a', 'zzz')).toBe(queue);
  });
});

const byUidDescending = (a: QueueEntry, b: QueueEntry) =>
  b.uid.localeCompare(a.uid);

describe('sortEntries', () => {
  it('reorders the list and the play order without changing the current track', () => {
    const queue = queueOf(['a', 'b', 'c', 'd'], { currentUid: 'b' });

    const result = sortEntries(queue, byUidDescending);

    expect(visible(result)).toEqual(['d', 'c', 'b', 'a']);
    expect(result.currentUid).toBe('b');
    expect(nextUid(result)).toBe('a');
  });

  it('keeps the shuffled play order untouched', () => {
    const queue = queueOf(['a', 'b', 'c'], {
      currentUid: 'a',
      shuffle: true,
      order: ['a', 'c', 'b'],
    });

    const result = sortEntries(queue, byUidDescending);

    expect(visible(result)).toEqual(['c', 'b', 'a']);
    expect(result.order).toEqual(['a', 'c', 'b']);
  });
});

describe('restoreOrder', () => {
  it('puts the entries back in the remembered order', () => {
    const queue = queueOf(['c', 'a', 'b'], { currentUid: 'a' });

    const result = restoreOrder(queue, ['a', 'b', 'c']);

    expect(visible(result)).toEqual(['a', 'b', 'c']);
    expect(result.order).toEqual(['a', 'b', 'c']);
    expect(result.currentUid).toBe('a');
  });

  it('keeps songs added since at the end and skips removed ones', () => {
    const queue = queueOf(['d', 'c', 'a', 'e']);

    expect(visible(restoreOrder(queue, ['a', 'b', 'c', 'd']))).toEqual([
      'a',
      'c',
      'd',
      'e',
    ]);
  });
});

describe('playEntry', () => {
  it('sets the current track', () => {
    expect(
      playEntry(queueOf(['a', 'b']), 'b', seededRandom(1)).currentUid
    ).toBe('b');
  });

  it('while shuffling, starts a new random order from the chosen track', () => {
    const result = playEntry(
      queueOf(['a', 'b', 'c', 'd'], { shuffle: true }),
      'c',
      seededRandom(8)
    );

    expect(result.order[0]).toBe('c');
    expect(result.order.toSorted()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores uids that are not in the queue', () => {
    expect(
      playEntry(queueOf(['a']), 'x', seededRandom(1)).currentUid
    ).toBeUndefined();
  });
});

describe('createQueue', () => {
  it('drops a current uid that is not in the entries', () => {
    const queue = createQueue(
      [entry('a')],
      { currentUid: 'x', shuffle: false, repeat: 'all' },
      seededRandom(1)
    );

    expect(queue.currentUid).toBeUndefined();
    expect(queue.repeat).toBe('all');
  });
});

describe('neighborAfterRemoval', () => {
  const entries = ['a', 'b', 'c'].map((uid) => entry(uid));

  it('picks the next row, or the previous one at the end', () => {
    expect(neighborAfterRemoval(entries, 'b')).toBe('c');
    expect(neighborAfterRemoval(entries, 'c')).toBe('b');
    expect(neighborAfterRemoval([entry('a')], 'a')).toBeUndefined();
    expect(neighborAfterRemoval(entries, 'x')).toBeUndefined();
  });
});
