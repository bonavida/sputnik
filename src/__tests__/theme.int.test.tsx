import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Rgb } from '@shared/types';
import {
  NEUTRAL_PALETTES,
  TEXT_CONTRAST,
  buildPalette,
  contrastRatio,
  fromHex,
} from '@/utils/color';
import {
  createTestBridge,
  getRow,
  makeTrack,
  renderApp,
} from '@/testing/renderApp';

const COVER_COLOR: Rgb = [196, 98, 64];

const cssVariable = (name: string) =>
  document.documentElement.style.getPropertyValue(name);

const setup = async () => {
  const tracks = [makeTrack(1, { color: COVER_COLOR }), makeTrack(2)];
  return renderApp({
    bridge: createTestBridge({ tracks, state: { session: { queue: tracks } } }),
  });
};

const openSettings = async (user: Awaited<ReturnType<typeof setup>>['user']) =>
  user.click(screen.getByRole('button', { name: 'Ajustes' }));

describe('theme', () => {
  it('tints the app with the cover color of the current song, keeping text readable', async () => {
    const { user, bridge } = await setup();

    await user.dblClick(getRow('Song 1'));

    // jsdom reports a light system theme
    const expected = buildPalette('light', COVER_COLOR);
    expect(cssVariable('--theme-canvas')).toBe(expected.canvas);
    expect(cssVariable('--theme-fg')).toBe(expected.fg);
    expect(
      contrastRatio(
        fromHex(cssVariable('--theme-fg')),
        fromHex(cssVariable('--theme-canvas'))
      )
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    // The native title bar follows the same colors
    await waitFor(() =>
      expect(bridge.calls.themes.at(-1)?.titleBar).toEqual({
        background: expected.canvas,
        symbol: expected.fg,
      })
    );
  });

  it('goes back to the neutral palette for songs without cover color', async () => {
    const { user } = await setup();
    await user.dblClick(getRow('Song 1'));

    await user.dblClick(getRow('Song 2'));

    expect(cssVariable('--theme-canvas')).toBe(NEUTRAL_PALETTES.light.canvas);
  });

  it('can turn the cover tint off', async () => {
    const { user, bridge } = await setup();
    await user.dblClick(getRow('Song 1'));

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitemcheckbox', { name: 'Color de la portada' })
    );

    expect(cssVariable('--theme-canvas')).toBe(NEUTRAL_PALETTES.light.canvas);
    await waitFor(() => expect(bridge.state.settings.albumTint).toBe(false));
  });

  it('switches to the dark theme and tells the window', async () => {
    const { user, bridge } = await setup();

    await openSettings(user);
    await user.click(screen.getByRole('menuitemradio', { name: 'Oscuro' }));

    expect(cssVariable('--theme-canvas')).toBe(NEUTRAL_PALETTES.dark.canvas);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(bridge.calls.themes.at(-1)?.source).toBe('dark');
    await waitFor(() => expect(bridge.state.settings.theme).toBe('dark'));
  });
});
