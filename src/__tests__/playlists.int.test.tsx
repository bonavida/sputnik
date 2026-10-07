import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Playlist } from '@shared/types';
import { resetAllStores } from '@/testing/zustandMock';
import {
  createTestBridge,
  getRow,
  makeTracks,
  renderApp,
  runTeardowns,
} from '@/testing/renderApp';

const rowTitles = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.font-medium')?.textContent);

const savedPlaylist = (tracks = makeTracks(2)): Playlist => ({
  id: 'saved',
  name: 'Guardada',
  tracks,
  createdAt: 1,
  updatedAt: 1,
});

const openPlaylistsMenu = async (
  user: Awaited<ReturnType<typeof renderApp>>['user']
) => user.click(screen.getByRole('button', { name: 'Listas' }));

describe('playlists', () => {
  it('renames the list in place: Enter saves, Escape cancels, empty names are ignored', async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Nueva lista' }));
    await user.keyboard('{Control>}a{/Control}Domingo{Enter}');
    expect(screen.getByRole('button', { name: 'Domingo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Domingo' }));
    await user.keyboard('{Control>}a{/Control}Otro nombre{Escape}');
    expect(screen.getByRole('button', { name: 'Domingo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Domingo' }));
    await user.keyboard('{Control>}a{/Control}{Backspace}{Enter}');
    expect(screen.getByRole('button', { name: 'Domingo' })).toBeInTheDocument();
  });

  it('keeps the old name on Escape even if the field blurs while closing', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Nueva lista' }));
    await user.keyboard('{Control>}a{/Control}Descartado');
    const input = screen.getByRole('textbox', { name: 'Nombre de la lista' });

    // Chromium fires blur on a focused field that is being removed, before
    // React finishes the update; jsdom does not, so both run in one batch
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.blur(input);
    });

    expect(
      screen.getByRole('button', { name: 'Nueva lista' })
    ).toBeInTheDocument();
  });

  it('saves the queue as a playlist and clears the unsaved mark', async () => {
    const tracks = makeTracks(2);
    const { user, bridge } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
    await waitFor(() => expect(bridge.state.playlists).toHaveLength(1));
    expect(bridge.state.playlists[0]).toMatchObject({
      name: 'Nueva lista',
      tracks,
    });
  });

  it('marks changes after saving and saves into the same playlist', async () => {
    const tracks = makeTracks(3);
    const { user, bridge } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await user.click(getRow('Song 2'));
    await user.keyboard('{Delete}');
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(bridge.state.playlists[0]?.tracks).toHaveLength(2)
    );
    expect(bridge.state.playlists).toHaveLength(1);
  });

  it('asks before discarding unsaved changes when opening another playlist', async () => {
    const queued = makeTracks(1);
    const saved = savedPlaylist(makeTracks(3).slice(1));
    const { user } = await renderApp({
      bridge: createTestBridge({
        tracks: makeTracks(3),
        state: { session: { queue: queued }, playlists: [saved] },
      }),
    });

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitemradio', { name: 'Guardada' }));

    const dialog = screen.getByRole('dialog', {
      name: '¿Descartar los cambios?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(rowTitles()).toEqual(['Song 1']);

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitemradio', { name: 'Guardada' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(rowTitles()).toEqual(['Song 2', 'Song 3']));
    expect(
      screen.getByRole('button', { name: 'Guardada' })
    ).toBeInTheDocument();
  });

  it('opens a saved playlist directly when there is nothing to lose', async () => {
    const { user } = await renderApp({
      bridge: createTestBridge({
        tracks: makeTracks(2),
        state: { playlists: [savedPlaylist()] },
      }),
    });

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitemradio', { name: 'Guardada' }));

    await waitFor(() => expect(rowTitles()).toEqual(['Song 1', 'Song 2']));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores the queue, the current song and the list name after a restart', async () => {
    const tracks = makeTracks(3);
    const bridge = createTestBridge({
      tracks,
      state: { session: { queue: tracks } },
    });
    const first = await renderApp({ bridge });
    await first.user.dblClick(getRow('Song 2'));
    await first.user.click(screen.getByRole('button', { name: 'Nueva lista' }));
    await first.user.keyboard('{Control>}a{/Control}Domingo{Enter}');
    await first.user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(bridge.state.session?.playlistName).toBe('Domingo')
    );

    // Close and reopen the app with the same persisted state
    first.unmount();
    runTeardowns();
    resetAllStores();
    const { audio } = await renderApp({ bridge });

    expect(rowTitles()).toEqual(['Song 1', 'Song 2', 'Song 3']);
    expect(screen.getByRole('button', { name: 'Domingo' })).toBeInTheDocument();
    expect(getRow('Song 2')).toHaveAttribute('aria-current', 'true');
    expect(audio.src).toBe('memory://media/t2');
    expect(audio.paused).toBe(true);
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
  });

  it('exports the songs in the order shown', async () => {
    const tracks = makeTracks(3);
    const { user, bridge } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.click(getRow('Song 3'));
    await user.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Exportar lista…' }));

    await waitFor(() => expect(bridge.calls.exported).toHaveLength(1));
    expect(bridge.calls.exported[0]?.tracks.map(({ id }) => id)).toEqual([
      't3',
      't1',
      't2',
    ]);
    expect(bridge.calls.dialogLabels.at(-1)).toEqual({
      title: 'Exportar lista…',
      filterName: 'Listas M3U',
    });
    expect(await screen.findByText('Lista exportada')).toBeInTheDocument();
  });

  it('imports an M3U playlist as a new, unsaved list', async () => {
    const tracks = makeTracks(2);
    const bridge = createTestBridge({ tracks });
    bridge.dialogs.playlist = {
      name: 'De VLC',
      tracks,
      failed: [{ path: 'https://radio.example/stream', reason: 'unsupported' }],
    };
    const { user } = await renderApp({ bridge });

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Importar lista…' }));

    await waitFor(() => expect(rowTitles()).toEqual(['Song 1', 'Song 2']));
    expect(screen.getByRole('button', { name: 'De VLC' })).toBeInTheDocument();
    expect(screen.getByText('No se pudo añadir 1 archivo')).toBeInTheDocument();
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });

  it('saves a copy with its own name', async () => {
    const tracks = makeTracks(2);
    const { user, bridge } = await renderApp({
      bridge: createTestBridge({
        tracks,
        state: { session: { queue: tracks } },
      }),
    });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await openPlaylistsMenu(user);
    await user.click(
      screen.getByRole('menuitem', { name: 'Guardar como copia' })
    );

    await waitFor(() => expect(bridge.state.playlists).toHaveLength(2));
    expect(bridge.state.playlists.map(({ name }) => name)).toEqual([
      'Nueva lista',
      'Nueva lista (copia)',
    ]);
    expect(
      screen.getByRole('button', { name: 'Nueva lista (copia)' })
    ).toBeInTheDocument();
  });

  it('deletes the current saved playlist after confirming, keeping the songs in the queue', async () => {
    const saved = savedPlaylist();
    const { user, bridge } = await renderApp({
      bridge: createTestBridge({
        tracks: saved.tracks,
        state: {
          playlists: [saved],
          session: {
            queue: saved.tracks,
            playlistId: saved.id,
            playlistName: saved.name,
          },
        },
      }),
    });

    await openPlaylistsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Borrar lista' }));
    await user.click(
      within(
        screen.getByRole('dialog', { name: '¿Borrar «Guardada»?' })
      ).getByRole('button', { name: 'Borrar' })
    );

    await waitFor(() => expect(bridge.state.playlists).toEqual([]));
    expect(rowTitles()).toEqual(['Song 1', 'Song 2']);
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });

  it('starts a new empty list', async () => {
    const saved = savedPlaylist();
    const { user } = await renderApp({
      bridge: createTestBridge({
        tracks: saved.tracks,
        state: {
          playlists: [saved],
          session: {
            queue: saved.tracks,
            playlistId: saved.id,
            playlistName: saved.name,
          },
        },
      }),
    });

    await openPlaylistsMenu(user);
    await act(() =>
      user.click(screen.getByRole('menuitem', { name: 'Nueva lista' }))
    );

    expect(
      screen.getByRole('heading', { name: 'Tu lista está vacía' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nueva lista' })
    ).toBeInTheDocument();
  });
});
