import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { importPaths } from '@/app/actions';
import {
  createTestBridge,
  getRow,
  makeTracks,
  renderApp,
} from '@/testing/renderApp';

const rowTitles = () =>
  screen
    .getAllByRole('option')
    .map((row) => within(row).getAllByText(/^Song \d+$/)[0]?.textContent);

describe('importing songs', () => {
  it('adds the songs picked in the dialog, in order, and hides the empty state', async () => {
    const tracks = makeTracks(3);
    const bridge = createTestBridge({ tracks });
    bridge.dialogs.files = [tracks[2], tracks[0]].map(
      (track) => track?.path ?? ''
    );
    const { user } = await renderApp({ bridge });

    await user.click(screen.getByRole('button', { name: 'Añadir canciones' }));

    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(rowTitles()).toEqual(['Song 3', 'Song 1']);
    expect(screen.queryByText('Tu lista está vacía')).not.toBeInTheDocument();
    expect(screen.getByText('2 canciones · 6 min')).toBeInTheDocument();
    expect(bridge.calls.dialogLabels.at(-1)).toEqual({
      title: 'Añadir canciones',
      filterName: 'Archivos de audio',
    });
  });

  it('disables play, previous, next and seeking until there is something to play', async () => {
    const tracks = makeTracks(2);
    const bridge = createTestBridge({ tracks });
    bridge.dialogs.files = tracks.map(({ path }) => path);
    const { user } = await renderApp({ bridge });
    const transport = ['Anterior', 'Reproducir', 'Siguiente'].map((name) =>
      screen.getByRole('button', { name })
    );
    const seek = screen.getByRole('slider', { name: 'Posición' });

    transport.forEach((button) => expect(button).toBeDisabled());
    expect(seek).toBeDisabled();
    // Modes can be set before adding songs
    expect(screen.getByRole('button', { name: 'Aleatorio' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Añadir canciones' }));
    await screen.findAllByRole('option');
    transport.forEach((button) => expect(button).toBeEnabled());
    expect(seek).toBeDisabled();

    await user.dblClick(getRow('Song 1'));
    expect(seek).toBeEnabled();
  });

  it('adds a whole folder from the add menu', async () => {
    const tracks = makeTracks(3);
    const bridge = createTestBridge({
      tracks,
      folders: { '/music': tracks.map(({ path }) => path) },
    });
    bridge.dialogs.folder = ['/music'];
    const { user } = await renderApp({ bridge });

    await user.click(screen.getByRole('button', { name: 'Añadir' }));
    await user.click(screen.getByRole('menuitem', { name: 'Añadir carpeta' }));

    expect(await screen.findAllByRole('option')).toHaveLength(3);
  });

  it('reports the files that could not be added and why (E9)', async () => {
    const [track] = makeTracks(1);
    const bridge = createTestBridge({
      tracks: track ? [track] : [],
      extraFiles: {
        'C:\\music\\broken.mp3': 'unreadable',
        '/docs/notes.txt': 'unsupported',
      },
    });
    bridge.dialogs.files = [
      track?.path ?? '',
      'C:\\music\\broken.mp3',
      '/docs/notes.txt',
    ];
    const { user } = await renderApp({ bridge });

    await user.click(screen.getByRole('button', { name: 'Añadir canciones' }));

    expect(
      await screen.findByText('No se pudieron añadir 2 archivos')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Ver detalles' }));

    expect(
      screen.getByText('broken.mp3: archivo dañado o ilegible')
    ).toBeInTheDocument();
    expect(
      screen.getByText('notes.txt: formato no compatible')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(
      screen.queryByText('No se pudieron añadir 2 archivos')
    ).not.toBeInTheDocument();
  });

  it('keeps every song when two imports overlap (R11)', async () => {
    const tracks = makeTracks(2);
    await renderApp({ bridge: createTestBridge({ tracks }) });

    await act(() =>
      Promise.all(tracks.map((track) => importPaths([track.path])))
    );

    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('adds files dropped on the window, showing a drop target meanwhile', async () => {
    const tracks = makeTracks(2);
    await renderApp({ bridge: createTestBridge({ tracks }) });
    const dataTransfer = {
      types: ['Files'],
      files: tracks.map((track) => new File([], track.path)),
    };

    fireEvent.dragEnter(window, { dataTransfer });

    expect(screen.getByText('Suelta para añadir')).toBeInTheDocument();

    fireEvent.drop(window, { dataTransfer });

    expect(screen.queryByText('Suelta para añadir')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
  });
});
