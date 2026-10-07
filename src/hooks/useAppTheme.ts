import { useEffect } from 'react';
import type { ThemeSource } from '@shared/types';
import { buildPalette } from '@/lib/color';
import type { Mode } from '@/lib/color';
import { bridge } from '@/lib/bridge';
import { currentTrack, usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMediaQuery } from './useMediaQuery';

const CSS_VARIABLES = {
  canvas: '--theme-canvas',
  raised: '--theme-raised',
  fg: '--theme-fg',
  fgMuted: '--theme-fg-muted',
  line: '--theme-line',
  accent: '--theme-accent',
} as const;

const resolveMode = (theme: ThemeSource, prefersDark: boolean): Mode => {
  if (theme !== 'system') return theme;
  return prefersDark ? 'dark' : 'light';
};

/**
 * Applies the palette (light/dark, optionally tinted by the cover) as CSS
 * variables and keeps the native title bar in the same colors.
 */
export const useAppTheme = (): Mode => {
  const theme = useSettingsStore((state) => state.theme);
  const albumTint = useSettingsStore((state) => state.albumTint);
  const coverColor = usePlayerStore((state) => currentTrack(state)?.color);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const mode = resolveMode(theme, prefersDark);
  const palette = buildPalette(mode, albumTint ? coverColor : undefined);
  const { canvas, raised, fg, fgMuted, line, accent } = palette;

  useEffect(() => {
    const root = document.documentElement;
    const values = { canvas, raised, fg, fgMuted, line, accent };
    Object.entries(CSS_VARIABLES).forEach(([token, variable]) => {
      root.style.setProperty(variable, values[token as keyof typeof values]);
    });
    root.style.colorScheme = mode;
    void bridge().setTheme(theme, { background: canvas, symbol: fg });
  }, [theme, mode, canvas, raised, fg, fgMuted, line, accent]);

  return mode;
};
