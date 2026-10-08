import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createTestBridge,
  getRow,
  makeTrack,
  renderApp,
} from '@/testing/renderApp';

// In no column's order, ascending or descending, so every header starts unsorted
const tracks = [
  makeTrack(1, { title: 'Glass Harbor', album: undefined, duration: 200 }),
  makeTrack(2, { title: 'Neon Tide', album: 'Shorelines', duration: 150 }),
  makeTrack(3, { title: 'apogee', album: 'Low Orbit', duration: 320 }),
];

// Opened from a saved playlist, so any change shows as unsaved
const setup = () =>
  renderApp({
    bridge: createTestBridge({
      tracks,
      state: {
        playlists: [
          { id: 'saved', name: 'Guardada', tracks, createdAt: 1, updatedAt: 1 },
        ],
        session: {
          queue: tracks,
          playlistId: 'saved',
          playlistName: 'Guardada',
        },
      },
    }),
  });

const rowTitles = () =>
  screen
    .getAllByRole('option')
    .map((row) => row.querySelector('.font-medium')?.textContent);

describe('sorting the list by a column', () => {
  it('sorts by title, then reverses on a second click', async () => {
    const { user } = await setup();

    await user.click(
      screen.getByRole('button', { name: 'Ordenar por título' })
    );
    expect(rowTitles()).toEqual(['apogee', 'Glass Harbor', 'Neon Tide']);

    await user.click(
      screen.getByRole('button', { name: 'Ordenar por título (ascendente)' })
    );
    expect(rowTitles()).toEqual(['Neon Tide', 'Glass Harbor', 'apogee']);
    expect(
      screen.getByRole('button', { name: 'Ordenar por título (descendente)' })
    ).toBeInTheDocument();
  });

  it('sorts by album, with songs without one last', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Ordenar por álbum' }));

    expect(rowTitles()).toEqual(['apogee', 'Neon Tide', 'Glass Harbor']);
  });

  it('sorts by duration without interrupting the song that plays', async () => {
    const { user, audio } = await setup();
    await user.dblClick(getRow('Glass Harbor'));

    await user.click(
      screen.getByRole('button', { name: 'Ordenar por duración' })
    );

    expect(rowTitles()).toEqual(['Neon Tide', 'Glass Harbor', 'apogee']);
    expect(getRow('Glass Harbor')).toHaveAttribute('aria-current', 'true');
    expect(audio.src).toBe('memory://media/t1');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(audio.src).toBe('memory://media/t3');
  });

  it('marks the list as changed so the new order can be saved', async () => {
    const { user } = await setup();
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Ordenar por título' })
    );

    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });
});

describe('showing a song in its folder', () => {
  it('opens the folder from the row button', async () => {
    const { user, bridge } = await setup();

    await user.click(
      within(getRow('apogee')).getByRole('button', {
        name: 'Mostrar en la carpeta',
      })
    );

    expect(bridge.calls.shownInFolder).toEqual(['t3']);
  });

  it('opens the folder of the selected song with Alt+Enter', async () => {
    const { user, bridge } = await setup();
    await user.click(getRow('Neon Tide'));

    await user.keyboard('{Alt>}{Enter}{/Alt}');

    expect(bridge.calls.shownInFolder).toEqual(['t2']);
  });
});
