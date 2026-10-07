import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestBridge, getRow, makeTracks, renderApp } from './renderApp';

const setup = async (count = 3) => {
  const tracks = makeTracks(count);
  return renderApp({
    bridge: createTestBridge({ tracks, state: { session: { queue: tracks } } }),
  });
};

const selectedTitle = () =>
  screen
    .getAllByRole('option')
    .find((option) => option.getAttribute('aria-selected') === 'true')
    ?.querySelector('.font-medium')?.textContent;

const rowTitles = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.font-medium')?.textContent);

describe('keyboard shortcuts', () => {
  it('moves the selection with the arrows and plays it with Enter', async () => {
    const { user, audio } = await setup();

    await user.keyboard('{ArrowDown}');
    expect(selectedTitle()).toBe('Song 1');

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(selectedTitle()).toBe('Song 3');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(audio.src).toBe('memory://media/t2');
  });

  it('removes the selected song with Delete and selects the next one (R6)', async () => {
    const { user } = await setup();
    await user.click(getRow('Song 2'));

    await user.keyboard('{Delete}');

    expect(rowTitles()).toEqual(['Song 1', 'Song 3']);
    expect(selectedTitle()).toBe('Song 3');

    await user.keyboard('{Backspace}');

    expect(rowTitles()).toEqual(['Song 1']);
    expect(selectedTitle()).toBe('Song 1');
  });

  it('plays and pauses with Space', async () => {
    const { user, audio } = await setup();

    await user.keyboard(' ');
    expect(audio.paused).toBe(false);

    await user.keyboard(' ');
    expect(audio.paused).toBe(true);
  });

  it('seeks 5 seconds with the left and right arrows', async () => {
    const { user, audio } = await setup();
    await user.dblClick(getRow('Song 1'));
    act(() => audio.loaded(180));
    act(() => audio.progress(20));

    await user.keyboard('{ArrowRight}');
    expect(audio.currentTime).toBe(25);

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(audio.currentTime).toBe(15);
  });

  it('toggles mute, shuffle and repeat with M, S and R', async () => {
    const { user, audio } = await setup();

    await user.keyboard('msr');

    expect(audio.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Aleatorio' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByRole('button', { name: 'Repetir: toda la lista' })
    ).toBeInTheDocument();
  });

  it('ignores shortcuts while typing the playlist name (U5)', async () => {
    const { user, audio } = await setup();
    await user.click(screen.getByRole('button', { name: 'Nueva lista' }));

    await user.keyboard('{Control>}a{/Control}Mis rs {Enter}');

    expect(audio.muted).toBe(false);
    expect(audio.paused).toBe(true);
    expect(screen.getByRole('button', { name: 'Mis rs' })).toBeInTheDocument();
  });

  it('lets Enter activate a focused button instead of playing the selection (U5)', async () => {
    const { user, audio } = await setup();
    await user.keyboard('{ArrowDown}');
    act(() => screen.getByRole('button', { name: 'Aleatorio' }).focus());

    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Aleatorio' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(audio.src).toBe('');
  });

  it('saves the playlist with Ctrl+S', async () => {
    const { user, bridge } = await setup();

    await user.keyboard('{Control>}s{/Control}');

    expect(bridge.state.playlists).toHaveLength(1);
    expect(bridge.state.playlists[0]?.tracks).toHaveLength(3);
  });

  it('opens the file dialog with Ctrl+O', async () => {
    const { user, bridge } = await setup();

    await user.keyboard('{Control>}o{/Control}');

    expect(bridge.calls.dialogLabels.at(-1)?.title).toBe('Añadir canciones');
  });
});
