import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeAudio } from './fakeAudio';
import {
  createTestBridge,
  getRow as row,
  makeTrack,
  makeTracks,
  renderApp,
  runTeardowns,
} from './renderApp';
import { resetAllStores } from './zustandMock';

const TRACK_COUNT = 3;

const setup = async () => {
  const tracks = makeTracks(TRACK_COUNT);
  const bridge = createTestBridge({
    tracks,
    state: { session: { queue: tracks } },
  });
  return renderApp({ bridge });
};

/** Plays Song 2, lets `leave` act on the audio, then restarts the app */
const playAndClose = async (
  leave: (audio: FakeAudio) => void
): Promise<Awaited<ReturnType<typeof renderApp>>> => {
  const first = await setup();
  await first.user.dblClick(row('Song 2'));
  act(() => first.audio.loaded(200));
  act(() => leave(first.audio));

  first.unmount();
  runTeardowns();
  resetAllStores();
  return renderApp({ bridge: first.bridge });
};

const nowPlayingTitle = () =>
  within(screen.getByRole('region', { name: 'Sonando' })).getByRole('heading')
    .textContent;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('playback', () => {
  it('plays a song on double click and shows it everywhere', async () => {
    const { user, audio, mediaSession } = await setup();

    await user.dblClick(row('Song 2'));

    expect(audio.src).toBe('memory://media/t2');
    expect(audio.paused).toBe(false);
    expect(nowPlayingTitle()).toBe('Song 2');
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(mediaSession.metadata).toMatchObject({
      title: 'Song 2',
      artist: 'Artist 2',
    });
    expect(mediaSession.playbackState).toBe('playing');
    expect(row('Song 2')).toHaveAttribute('aria-current', 'true');
  });

  it('marks the current song as playing or paused in the list', async () => {
    const { user } = await setup();
    await user.dblClick(row('Song 2'));

    expect(
      within(row('Song 2')).getByRole('img', { name: 'Sonando' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(
      within(row('Song 2')).getByRole('img', { name: 'En pausa' })
    ).toBeInTheDocument();
  });

  it('pauses and resumes with the play button', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));

    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(audio.paused).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(audio.paused).toBe(false);
  });

  it('moves on to the next song when one ends', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));

    act(() => audio.finish());

    expect(audio.src).toBe('memory://media/t2');
    expect(audio.paused).toBe(false);
    expect(nowPlayingTitle()).toBe('Song 2');
  });

  it('stops on the last song at 0:00 and keeps it visible (R13)', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 3'));
    act(() => audio.progress(120));

    act(() => audio.finish());

    expect(audio.src).toBe('memory://media/t3');
    expect(audio.currentTime).toBe(0);
    expect(nowPlayingTitle()).toBe('Song 3');
    expect(
      screen.getByRole('button', { name: 'Reproducir' })
    ).toBeInTheDocument();
  });

  it('applies repeat right away, without waiting for the song to change (R1)', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 3'));

    await user.click(
      screen.getByRole('button', { name: 'Repetir: desactivado' })
    );
    expect(
      screen.getByRole('button', { name: 'Repetir: toda la lista' })
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(audio.src).toBe('memory://media/t1');
  });

  it('replays the same song with repeat one', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 2'));
    await user.click(
      screen.getByRole('button', { name: 'Repetir: desactivado' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Repetir: toda la lista' })
    );
    act(() => audio.progress(170));

    act(() => audio.finish());

    expect(audio.src).toBe('memory://media/t2');
    expect(audio.currentTime).toBe(0);
    expect(audio.paused).toBe(false);
  });

  it('restarts the song when double clicking the one already playing (R9)', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));
    act(() => audio.progress(42));

    await user.dblClick(row('Song 1'));

    expect(audio.currentTime).toBe(0);
  });

  it('restarts the song on «previous» after 3 seconds, otherwise goes back', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 2'));
    act(() => audio.progress(10));

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(audio.src).toBe('memory://media/t2');
    expect(audio.currentTime).toBe(0);

    act(() => audio.progress(1));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(audio.src).toBe('memory://media/t1');
  });

  it('does nothing on «next» when nothing is playing (R2)', async () => {
    const { user, audio } = await setup();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(audio.src).toBe('');
    expect(nowPlayingTitle()).toBe('Nada sonando');
  });

  it('starts from the first song when pressing play with nothing playing', async () => {
    const { user, audio } = await setup();

    await user.click(screen.getByRole('button', { name: 'Reproducir' }));

    expect(audio.src).toBe('memory://media/t1');
  });

  it('gives the OS media controls the cover as a blob URL', async () => {
    // Chromium drops Media Session artwork that is not http(s), data or blob
    const fetchCover = vi.fn<typeof fetch>(
      async () => new Response(new Blob(['png'], { type: 'image/png' }))
    );
    vi.stubGlobal('fetch', fetchCover);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cover');
    const tracks = [makeTrack(1, { coverUrl: 'sputnik://cover/abc.png' })];
    const { user, mediaSession } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });

    await user.dblClick(row('Song 1'));

    await waitFor(() =>
      expect(mediaSession.metadata?.artwork).toEqual([{ src: 'blob:cover' }])
    );
    expect(fetchCover).toHaveBeenCalledWith('sputnik://cover/abc.png');
  });

  it('follows the OS media controls (Media Session)', async () => {
    const { user, audio, mediaSession } = await setup();
    await user.dblClick(row('Song 1'));

    act(() =>
      mediaSession.handlers.get('nexttrack')?.({ action: 'nexttrack' })
    );
    expect(audio.src).toBe('memory://media/t2');

    act(() => mediaSession.handlers.get('pause')?.({ action: 'pause' }));
    expect(audio.paused).toBe(true);

    act(() =>
      mediaSession.handlers.get('seekto')?.({ action: 'seekto', seekTime: 30 })
    );
    expect(audio.currentTime).toBe(30);
  });

  it('reflects playback changes made outside the app, like a headset button', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));

    act(() => audio.pause());

    expect(
      screen.getByRole('button', { name: 'Reproducir' })
    ).toBeInTheDocument();
  });

  it('seeks with the position slider', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));
    act(() => audio.loaded(200));

    const slider = screen.getByRole('slider', { name: 'Posición' });
    // user-event cannot drive range inputs; this is the event a drag produces
    fireEvent.change(slider, { target: { value: '200' } });

    expect(audio.currentTime).toBe(200);
    expect(slider).toHaveAttribute('aria-valuetext', '3:20 de 3:20');
  });

  describe('after closing and reopening the app', () => {
    it('resumes a paused song where it was left', async () => {
      const { audio } = await playAndClose((playing) => {
        playing.progress(83.4);
        playing.pause();
      });

      expect(audio.src).toBe('memory://media/t2');
      expect(audio.currentTime).toBe(83.4);
      expect(audio.paused).toBe(true);
      expect(screen.getByRole('slider', { name: 'Posición' })).toHaveAttribute(
        'aria-valuetext',
        '1:23 de 3:00'
      );
    });

    it('resumes a song that was playing when the window closed', async () => {
      // Less than the periodic save interval: only the save on close keeps it
      const { audio } = await playAndClose((playing) => {
        playing.progress(7);
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(audio.currentTime).toBe(7);
    });

    it('keeps the position within a few seconds even if the app quits abruptly', async () => {
      const { audio } = await playAndClose((playing) => {
        playing.progress(42);
        playing.progress(44);
      });

      expect(audio.currentTime).toBeGreaterThanOrEqual(42);
    });

    it('starts the next song from the beginning', async () => {
      const { audio } = await playAndClose((playing) => {
        playing.progress(150);
        playing.finish();
      });

      expect(audio.src).toBe('memory://media/t3');
      expect(audio.currentTime).toBe(0);
    });
  });

  it('shows the time a click would jump to while hovering the position slider', async () => {
    const { user, audio } = await setup();
    await user.dblClick(row('Song 1'));
    act(() => audio.loaded(200));
    const slider = screen.getByRole('slider', { name: 'Posición' });
    // jsdom has no layout: a 212 px slider whose thumb travels from 6 to 206 px
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 212,
    } as DOMRect);

    fireEvent.mouseMove(slider, { clientX: 100 + 6 + 75 });
    expect(screen.getByRole('tooltip')).toHaveTextContent('1:15');

    fireEvent.mouseLeave(slider);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
