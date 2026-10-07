import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setRandomSource } from '@/stores/playerStore';
import {
  createTestBridge,
  getRow,
  makeTracks,
  renderApp,
} from '@/testing/renderApp';

// Mouse drag and drop needs real layout, which jsdom lacks: it is checked by
// hand. These tests reorder with Alt+arrows, which runs the same store action.

const setup = async () => {
  const tracks = makeTracks(4);
  return renderApp({
    bridge: createTestBridge({ tracks, state: { session: { queue: tracks } } }),
  });
};

const rowTitles = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.font-medium')?.textContent);

const nowPlayingTitle = () =>
  within(screen.getByRole('region', { name: 'Sonando' })).getByRole('heading')
    .textContent;

describe('reordering the queue (R5)', () => {
  it('keeps the current song and plays the next one in the new order', async () => {
    const { user, audio } = await setup();
    await user.dblClick(getRow('Song 2'));
    await user.click(getRow('Song 4'));

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

    expect(rowTitles()).toEqual(['Song 1', 'Song 2', 'Song 4', 'Song 3']);
    expect(nowPlayingTitle()).toBe('Song 2');
    expect(audio.src).toBe('memory://media/t2');
    expect(getRow('Song 2')).toHaveAttribute('aria-current', 'true');

    act(() => audio.finish());

    expect(audio.src).toBe('memory://media/t4');
  });

  it('moves the current song itself without interrupting it', async () => {
    const { user, audio } = await setup();
    await user.dblClick(getRow('Song 1'));
    act(() => audio.progress(60));

    await user.keyboard('{Alt>}{ArrowDown}{ArrowDown}{/Alt}');

    expect(rowTitles()).toEqual(['Song 2', 'Song 3', 'Song 1', 'Song 4']);
    expect(audio.currentTime).toBe(60);
    expect(getRow('Song 1')).toHaveAttribute('aria-current', 'true');
  });

  it('while shuffling, keeps the random play order', async () => {
    // With random() always 0, Fisher–Yates turns [2, 3, 4] into [3, 4, 2]
    setRandomSource(() => 0);
    const { user, audio } = await setup();
    await user.click(screen.getByRole('button', { name: 'Aleatorio' }));
    await user.dblClick(getRow('Song 1'));

    await user.click(getRow('Song 3'));
    await user.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    act(() => audio.finish());

    expect(rowTitles()).toEqual(['Song 3', 'Song 1', 'Song 2', 'Song 4']);
    // Following the visible order would play Song 2 instead
    expect(audio.src).toBe('memory://media/t3');
  });
});
