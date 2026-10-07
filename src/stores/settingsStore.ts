import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@shared/constants';
import type { LocaleSetting, ThemeSource } from '@shared/types';
import { createTranslate, resolveLocale } from '@/i18n/t';
import type { Translate } from '@/i18n/t';

interface SettingsState {
  theme: ThemeSource;
  albumTint: boolean;
  locale: LocaleSetting;
}

interface SettingsActions {
  setTheme: (theme: ThemeSource) => void;
  setAlbumTint: (albumTint: boolean) => void;
  setLocale: (locale: LocaleSetting) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  (set) => ({
    theme: DEFAULT_SETTINGS.theme,
    albumTint: DEFAULT_SETTINGS.albumTint,
    locale: DEFAULT_SETTINGS.locale,
    setTheme: (theme) => set({ theme }),
    setAlbumTint: (albumTint) => set({ albumTint }),
    setLocale: (locale) => set({ locale }),
  })
);

/** Translator for code outside React (dialog titles, actions) */
export const getTranslate = (): Translate =>
  createTranslate(
    resolveLocale(useSettingsStore.getState().locale, navigator.language)
  );
