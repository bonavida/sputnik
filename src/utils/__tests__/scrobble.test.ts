import { describe, expect, it } from 'vitest';
import { listenTarget, listenedBetween, toScrobbleTrack } from '../scrobble';

describe('listenTarget', () => {
  it.each([
    [30, undefined],
    [31, 15.5],
    [200, 100],
    [480, 240],
    [3_600, 240],
  ])('a %i s song needs %s s of listening', (duration, target) => {
    expect(listenTarget(duration)).toBe(target);
  });
});

describe('listenedBetween', () => {
  it('counts normal playback', () => {
    expect(listenedBetween(10, 10.25)).toBe(0.25);
  });

  it.each([
    ['a seek forward', 10, 95],
    ['a seek back', 95, 10],
    ['no change', 10, 10],
  ])('does not count %s', (_, previous, current) => {
    expect(listenedBetween(previous, current)).toBe(0);
  });
});

describe('toScrobbleTrack', () => {
  const track = { id: 'a', path: '/a.mp3', title: 'One', duration: 199.6 };

  it('needs an artist', () => {
    expect(toScrobbleTrack(track, 199.6)).toBeUndefined();
  });

  it('rounds the duration to whole seconds', () => {
    expect(
      toScrobbleTrack({ ...track, artist: 'A', album: 'X' }, 199.6)
    ).toEqual({ artist: 'A', title: 'One', album: 'X', duration: 200 });
  });
});
