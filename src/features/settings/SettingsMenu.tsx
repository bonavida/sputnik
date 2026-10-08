import { Settings2 } from 'lucide-react';
import type {
  LastfmStatus,
  LocaleSetting,
  ThemeSource,
  UpdateStatus,
} from '@shared/types';
import {
  cancelLastfmConnect,
  connectLastfm,
  disconnectLastfm,
  setScrobbling,
} from '@/app/lastfm';
import { checkForUpdates, setAutomaticUpdates } from '@/app/updates';
import { Menu } from '@/ui/Menu';
import type { MenuItem } from '@/ui/Menu';
import { useT } from '@/hooks/useT';
import type { Translate, TranslationKey } from '@/i18n/t';
import { useLastfmStore } from '@/stores/lastfmStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUpdateStore } from '@/stores/updateStore';

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

const lastfmItems = (
  t: Translate,
  status: LastfmStatus,
  isConnecting: boolean
): MenuItem[] => {
  const { isAvailable, user, isEnabled, pending } = status;
  if (!isAvailable) return [];
  const header: MenuItem[] = [
    { kind: 'separator', id: 'lastfm-separator' },
    { kind: 'heading', id: 'lastfm-heading', label: t('lastfm') },
  ];

  if (isConnecting)
    return [
      ...header,
      { kind: 'note', id: 'lastfm-waiting', label: t('lastfmWaiting') },
      {
        kind: 'action',
        id: 'lastfm-cancel',
        label: t('lastfmCancel'),
        onSelect: cancelLastfmConnect,
      },
    ];

  if (!user)
    return [
      ...header,
      {
        kind: 'action',
        id: 'lastfm-connect',
        label: t('lastfmConnect'),
        onSelect: () => void connectLastfm(),
      },
    ];

  return [
    ...header,
    {
      kind: 'note',
      id: 'lastfm-user',
      label: t('lastfmConnectedAs', { user }),
    },
    {
      kind: 'checkbox',
      id: 'lastfm-scrobbling',
      label: t('lastfmScrobbling'),
      isChecked: isEnabled,
      onSelect: () => void setScrobbling(!isEnabled),
    },
    ...(pending > 0
      ? [
          {
            kind: 'note',
            id: 'lastfm-pending',
            label: t('lastfmPending', { count: pending }),
          } satisfies MenuItem,
        ]
      : []),
    {
      kind: 'action',
      id: 'lastfm-disconnect',
      label: t('lastfmDisconnect'),
      onSelect: () => void disconnectLastfm(),
    },
  ];
};

const updateItems = (t: Translate, status?: UpdateStatus): MenuItem[] => {
  if (!status) return [];
  const { currentVersion, checkAutomatically, isChecking } = status;
  return [
    { kind: 'separator', id: 'updates-separator' },
    { kind: 'heading', id: 'updates-heading', label: t('updates') },
    {
      kind: 'note',
      id: 'updates-version',
      label: t('currentVersion', { version: currentVersion }),
    },
    {
      kind: 'checkbox',
      id: 'updates-automatic',
      label: t('checkAutomatically'),
      isChecked: checkAutomatically,
      onSelect: () => void setAutomaticUpdates(!checkAutomatically),
    },
    isChecking
      ? { kind: 'note', id: 'updates-checking', label: t('checkingUpdates') }
      : {
          kind: 'action',
          id: 'updates-check',
          label: t('checkNow'),
          onSelect: () => void checkForUpdates(),
        },
  ];
};

export const SettingsMenu = () => {
  const t = useT();
  const { theme, albumTint, locale, setTheme, setAlbumTint, setLocale } =
    useSettingsStore();
  const lastfmStatus = useLastfmStore((state) => state.status);
  const isConnecting = useLastfmStore((state) => state.isConnecting);
  const updateStatus = useUpdateStore((state) => state.status);

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
    ...lastfmItems(t, lastfmStatus, isConnecting),
    ...updateItems(t, updateStatus),
  ];

  return <Menu label={t('settings')} icon={Settings2} items={items} />;
};
