import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createTestBridge,
  getRow as row,
  makeTracks,
  renderApp,
} from '@/testing/renderApp';

const isMarkedUnplayable = (title: string) =>
  within(row(title)).queryByLabelText('No se puede reproducir') !== null;

describe('playback errors (R7)', () => {
  it('marks a song that cannot be decoded and skips to the next one', async () => {
    const tracks = makeTracks(3);
    const { user, audio } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.dblClick(row('Song 1'));

    act(() => audio.fail());

    expect(isMarkedUnplayable('Song 1')).toBe(true);
    expect(audio.src).toBe('memory://media/t2');
    expect(audio.paused).toBe(false);
  });

  it('stops instead of looping forever when no song can play', async () => {
    const tracks = makeTracks(2);
    const { user, audio } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.click(
      screen.getByRole('button', { name: 'Repetir: desactivado' })
    );
    await user.dblClick(row('Song 1'));

    act(() => audio.fail());
    act(() => audio.fail());

    expect(isMarkedUnplayable('Song 1')).toBe(true);
    expect(isMarkedUnplayable('Song 2')).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Reproducir' })
    ).toBeInTheDocument();
  });

  it('does not stay in «playing» when the browser refuses to play', async () => {
    const tracks = makeTracks(1);
    const { user, audio } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    audio.rejectNextPlay = new DOMException(
      'Unsupported source',
      'NotSupportedError'
    );

    await user.dblClick(row('Song 1'));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reproducir' })
      ).toBeInTheDocument()
    );
    expect(isMarkedUnplayable('Song 1')).toBe(true);
  });

  it('gives an unplayable song another chance when played explicitly', async () => {
    const tracks = makeTracks(2);
    const { user, audio } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.dblClick(row('Song 1'));
    act(() => audio.fail());

    await user.dblClick(row('Song 1'));

    expect(isMarkedUnplayable('Song 1')).toBe(false);
    expect(audio.src).toBe('memory://media/t1');
  });

  it('warns about songs of the last session whose files are gone', async () => {
    const tracks = makeTracks(3);
    const [first, second, third] = tracks;
    const { user } = await renderApp({
      bridge: createTestBridge({
        tracks: [first, third].filter((track) => track !== undefined),
        state: { session: { queue: tracks } },
      }),
    });

    expect(
      screen.getByText('Falta 1 canción de esta lista')
    ).toBeInTheDocument();
    expect(isMarkedUnplayable('Song 2')).toBe(true);
    expect(isMarkedUnplayable('Song 1')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Ver detalles' }));
    expect(
      screen.getByText(`${second?.path.split('/').at(-1)}`)
    ).toBeInTheDocument();
  });
});
