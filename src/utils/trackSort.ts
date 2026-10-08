import type { Track } from '@shared/types';

export type SortKey = 'title' | 'album' | 'duration';
export type SortDirection = 'ascending' | 'descending';

export interface SortOrder {
  key: SortKey;
  direction: SortDirection;
}

type Compare = (a: Track, b: Track) => number;

const SORT_KEYS: readonly SortKey[] = ['title', 'album', 'duration'];
const DIRECTIONS: readonly SortDirection[] = ['ascending', 'descending'];

// Missing values go last in both directions, like file managers do
const lastIfMissing = (a: string | undefined, b: string | undefined) =>
  Number(a === undefined) - Number(b === undefined);

const directed = (compare: Compare, direction: SortDirection): Compare =>
  direction === 'ascending' ? compare : (a, b) => compare(b, a);

/**
 * Natural, case- and accent-insensitive order in the UI language ("Track 2"
 * before "Track 10", "Álbum" with "Album"). Ties fall back to the title.
 */
export const compareTracks = (
  { key, direction }: SortOrder,
  locale: string
): Compare => {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  });
  const byTitle: Compare = (a, b) =>
    collator.compare(a.title, b.title) ||
    collator.compare(a.artist ?? '', b.artist ?? '');

  const byKey: Record<SortKey, Compare> = {
    title: byTitle,
    album: (a, b) =>
      collator.compare(a.album ?? '', b.album ?? '') || byTitle(a, b),
    duration: (a, b) => a.duration - b.duration || byTitle(a, b),
  };
  const sorted = directed(byKey[key], direction);
  return key === 'album'
    ? (a, b) => lastIfMissing(a.album, b.album) || sorted(a, b)
    : sorted;
};

/** The column the list is currently sorted by, if any (derived, never stored) */
export const sortOrderOf = (
  tracks: readonly Track[],
  locale: string
): SortOrder | undefined => {
  if (tracks.length < 2) return undefined;
  const isSorted = (order: SortOrder) => {
    const compare = compareTracks(order, locale);
    return tracks.every(
      (track, index) =>
        index === 0 || compare(tracks[index - 1] as Track, track) <= 0
    );
  };
  return SORT_KEYS.flatMap((key) =>
    DIRECTIONS.map((direction) => ({ key, direction }))
  ).find(isSorted);
};

/** Clicking a column sorts ascending, and toggles once it is sorted by it */
export const nextSortOrder = (
  key: SortKey,
  current: SortOrder | undefined
): SortOrder => ({
  key,
  direction:
    current?.key === key && current.direction === 'ascending'
      ? 'descending'
      : 'ascending',
});
