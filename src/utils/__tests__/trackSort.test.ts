import { describe, expect, it } from 'vitest';
import type { Track } from '@shared/types';
import { compareTracks, nextSortOrder, sortOrderOf } from '../trackSort';

const track = (title: string, overrides: Partial<Track> = {}): Track => ({
  id: title,
  path: `/${title}.mp3`,
  title,
  duration: 200,
  ...overrides,
});

const titles = (tracks: Track[]) => tracks.map(({ title }) => title);

describe('compareTracks', () => {
  it('sorts titles naturally, ignoring case and accents', () => {
    const tracks = [
      track('track 10'),
      track('Track 2'),
      track('Árbol'),
      track('arbusto'),
    ];

    expect(
      titles(
        tracks.toSorted(
          compareTracks({ key: 'title', direction: 'ascending' }, 'es')
        )
      )
    ).toEqual(['Árbol', 'arbusto', 'Track 2', 'track 10']);
  });

  it('keeps songs without an album last in both directions', () => {
    const tracks = [
      track('No album'),
      track('B side', { album: 'Beta' }),
      track('A side', { album: 'Alpha' }),
    ];

    expect(
      titles(
        tracks.toSorted(
          compareTracks({ key: 'album', direction: 'ascending' }, 'en')
        )
      )
    ).toEqual(['A side', 'B side', 'No album']);
    expect(
      titles(
        tracks.toSorted(
          compareTracks({ key: 'album', direction: 'descending' }, 'en')
        )
      )
    ).toEqual(['B side', 'A side', 'No album']);
  });

  it('breaks ties by title', () => {
    const tracks = [
      track('b', { duration: 100 }),
      track('a', { duration: 100 }),
    ];

    expect(
      titles(
        tracks.toSorted(
          compareTracks({ key: 'duration', direction: 'ascending' }, 'en')
        )
      )
    ).toEqual(['a', 'b']);
  });
});

describe('sortOrderOf', () => {
  it('recognizes the column and direction the list is sorted by', () => {
    const tracks = [
      track('C', { duration: 100 }),
      track('A', { duration: 200 }),
      track('B', { duration: 300 }),
    ];

    expect(sortOrderOf(tracks, 'en')).toEqual({
      key: 'duration',
      direction: 'ascending',
    });
    expect(sortOrderOf(tracks.toReversed(), 'en')).toEqual({
      key: 'duration',
      direction: 'descending',
    });
  });

  it('is undefined for a list in a custom order or too short to tell', () => {
    expect(
      sortOrderOf(
        [
          track('B', { duration: 300 }),
          track('C', { duration: 100 }),
          track('A', { duration: 200 }),
        ],
        'en'
      )
    ).toBeUndefined();
    expect(sortOrderOf([track('A')], 'en')).toBeUndefined();
  });
});

describe('nextSortOrder', () => {
  it('starts ascending and toggles on the same column', () => {
    const ascending = nextSortOrder('title', undefined);
    expect(ascending).toEqual({ key: 'title', direction: 'ascending' });
    expect(nextSortOrder('title', ascending).direction).toBe('descending');
    expect(
      nextSortOrder('title', { key: 'title', direction: 'descending' })
        .direction
    ).toBe('ascending');
    expect(nextSortOrder('album', ascending).direction).toBe('ascending');
  });
});
