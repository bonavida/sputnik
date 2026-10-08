import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '@shared/types';
import type { FakeAudio } from '@/testing/fakeAudio';
import {
  createTestBridge,
  getRow,
  makeTrack,
  makeTracks,
  renderApp,
} from '@/testing/renderApp';

const NOW_MS = 1_791_400_000_000;

type Bridge = ReturnType<typeof createTestBridge>;

const setup = async ({
  tracks = makeTracks(2),
  lastfm = {},
}: {
  tracks?: Track[];
  lastfm?: Partial<Bridge['lastfm']>;
} = {}) => {
  const bridge = createTestBridge({
    tracks,
    state: { session: { queue: tracks } },
  });
  bridge.lastfm = { ...bridge.lastfm, ...lastfm };
  return renderApp({ bridge });
};

/** Plays from `from` to `to` seconds in timeupdate steps, like the browser */
const playThrough = (audio: FakeAudio, from: number, to: number) =>
  act(() => {
    Array.from(
      { length: Math.round((to - from) / 0.25) + 1 },
      (_, step) => from + step * 0.25
    ).forEach((time) => audio.progress(time));
  });

const openSettings = async (user: Awaited<ReturnType<typeof setup>>['user']) =>
  user.click(screen.getByRole('button', { name: 'Ajustes' }));

afterEach(() => vi.restoreAllMocks());

describe('Last.fm account', () => {
  it('is not offered in builds without an API key', async () => {
    const { user } = await setup({ lastfm: { isAvailable: false } });

    await openSettings(user);

    expect(screen.queryByText('Last.fm')).not.toBeInTheDocument();
  });

  it('connects from the settings menu and shows the account', async () => {
    const { user } = await setup();

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitem', { name: 'Conectar con Last.fm' })
    );

    expect(
      await screen.findByText('Conectado a Last.fm como sputnik-fan')
    ).toBeInTheDocument();
    await openSettings(user);
    expect(screen.getByText('Conectado como sputnik-fan')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Hacer scrobbling' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('explains when the approval in the browser did not happen in time', async () => {
    const { user } = await setup({ lastfm: { nextConnect: 'timed-out' } });

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitem', { name: 'Conectar con Last.fm' })
    );

    expect(
      await screen.findByText(/No se completó la autorización/)
    ).toBeInTheDocument();
  });

  it('pauses scrobbling and disconnects from the menu', async () => {
    const { user, bridge } = await setup({ lastfm: { user: 'diego' } });

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitemcheckbox', { name: 'Hacer scrobbling' })
    );
    expect(bridge.lastfm.isEnabled).toBe(false);

    await openSettings(user);
    await user.click(screen.getByRole('menuitem', { name: 'Desconectar' }));
    expect(bridge.lastfm.user).toBeUndefined();
    await openSettings(user);
    expect(
      screen.getByRole('menuitem', { name: 'Conectar con Last.fm' })
    ).toBeInTheDocument();
  });

  it('shows how many scrobbles are waiting to be sent', async () => {
    const { user } = await setup({ lastfm: { user: 'diego', pending: 3 } });

    await openSettings(user);

    expect(
      screen.getByText('3 scrobbles pendientes de enviar')
    ).toBeInTheDocument();
  });
});

describe('scrobbling', () => {
  it('reports the song as playing and scrobbles it after half of it', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    const { user, audio, bridge } = await setup({
      lastfm: { user: 'diego' },
    });

    await user.dblClick(getRow('Song 1'));
    act(() => audio.loaded(200));
    expect(bridge.calls.nowPlaying).toEqual([
      { artist: 'Artist 1', title: 'Song 1', album: 'Album', duration: 180 },
    ]);

    playThrough(audio, 0, 99);
    expect(bridge.calls.scrobbles).toEqual([]);

    playThrough(audio, 99, 120);
    expect(bridge.calls.scrobbles).toEqual([
      {
        artist: 'Artist 1',
        title: 'Song 1',
        album: 'Album',
        duration: 200,
        timestamp: NOW_MS / 1000,
      },
    ]);
  });

  it('does not count seeking to the end as listening', async () => {
    const { user, audio, bridge } = await setup({
      lastfm: { user: 'diego' },
    });

    await user.dblClick(getRow('Song 1'));
    act(() => audio.loaded(200));
    playThrough(audio, 0, 10);
    playThrough(audio, 170, 199);

    expect(bridge.calls.scrobbles).toEqual([]);
  });

  it('scrobbles a song again when it is played again', async () => {
    const { user, audio, bridge } = await setup({
      lastfm: { user: 'diego' },
    });

    await user.dblClick(getRow('Song 1'));
    playThrough(audio, 0, 100);
    await user.dblClick(getRow('Song 1'));
    playThrough(audio, 0, 100);

    expect(bridge.calls.scrobbles).toHaveLength(2);
  });

  it('skips songs that are too short or have no artist', async () => {
    const tracks = [
      makeTrack(1, { duration: 25 }),
      makeTrack(2, { artist: undefined }),
    ];
    const { user, audio, bridge } = await setup({
      tracks,
      lastfm: { user: 'diego' },
    });

    await user.dblClick(getRow('Song 1'));
    playThrough(audio, 0, 24);
    await user.dblClick(getRow('Song 2'));
    playThrough(audio, 0, 120);

    expect(bridge.calls.scrobbles).toEqual([]);
    expect(bridge.calls.nowPlaying.map(({ title }) => title)).toEqual([
      'Song 1',
    ]);
  });

  it('sends nothing while scrobbling is paused', async () => {
    const { user, audio, bridge } = await setup({
      lastfm: { user: 'diego', isEnabled: false },
    });

    await user.dblClick(getRow('Song 1'));
    playThrough(audio, 0, 120);

    expect(bridge.calls.nowPlaying).toEqual([]);
    expect(bridge.calls.scrobbles).toEqual([]);
  });
});
