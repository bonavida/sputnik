import { Settings2 } from 'lucide-react';
import type { LocaleSetting, ThemeSource } from '@shared/types';
import { Menu } from '@/components/Menu';
import type { MenuItem } from '@/components/Menu';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n/t';
import { useSettingsStore } from '@/stores/settingsStore';

const THEMES: Array<[ThemeSource, TranslationKey]> = [
  ['system', 'themeSystem'],
  ['light', 'themeLight'],
  ['dark', 'themeDark'],
];

const LOCALES: Array<[LocaleSetting, TranslationKey]> = [
  ['system', 'languageSystem'],
  ['es', 'languageEs'],
  ['en', 'languageEn'],
];

export const SettingsMenu = () => {
  const t = useT();
  const { theme, albumTint, locale, setTheme, setAlbumTint, setLocale } =
    useSettingsStore();

  const items: MenuItem[] = [
    { kind: 'heading', id: 'theme-heading', label: t('theme') },
    ...THEMES.map(([value, label]): MenuItem => ({
      kind: 'radio',
      id: `theme-${value}`,
      label: t(label),
      isChecked: theme === value,
      onSelect: () => setTheme(value),
    })),
    { kind: 'separator', id: 'tint-separator' },
    {
      kind: 'checkbox',
      id: 'album-tint',
      label: t('coverColor'),
      isChecked: albumTint,
      onSelect: () => setAlbumTint(!albumTint),
    },
    { kind: 'separator', id: 'language-separator' },
    { kind: 'heading', id: 'language-heading', label: t('language') },
    ...LOCALES.map(([value, label]): MenuItem => ({
      kind: 'radio',
      id: `locale-${value}`,
      label: t(label),
      isChecked: locale === value,
      onSelect: () => setLocale(value),
    })),
  ];

  return <Menu label={t('settings')} icon={Settings2} items={items} />;
};
