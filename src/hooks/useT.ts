import { createTranslate, resolveLocale } from '@/i18n/t';
import type { Locale, Translate } from '@/i18n/t';
import { useSettingsStore } from '@/stores/settingsStore';

export const useLocale = (): Locale => {
  const setting = useSettingsStore((state) => state.locale);
  return resolveLocale(setting, navigator.language);
};

export const useT = (): Translate => createTranslate(useLocale());
