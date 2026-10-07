import {
  Copy,
  FileDown,
  FileUp,
  ListMusic,
  ListPlus,
  Trash2,
} from 'lucide-react';
import {
  confirmDiscard,
  deletePlaylist,
  exportPlaylist,
  importPlaylistFile,
  newPlaylist,
  openPlaylist,
  savePlaylistCopy,
} from '@/app/actions';
import { Menu } from '@/ui/Menu';
import type { MenuItem } from '@/ui/Menu';
import { useT } from '@/hooks/useT';
import { usePlaylistsStore } from '@/stores/playlistsStore';

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const PlaylistsMenu = () => {
  const t = useT();
  const playlists = usePlaylistsStore((state) => state.playlists);
  const currentId = usePlaylistsStore((state) => state.currentId);
  const current = playlists.find(({ id }) => id === currentId);

  const saved: MenuItem[] =
    playlists.length > 0
      ? playlists
          .toSorted((a, b) => collator.compare(a.name, b.name))
          .map((playlist) => ({
            kind: 'radio',
            id: `playlist-${playlist.id}`,
            label: playlist.name,
            isChecked: playlist.id === currentId,
            onSelect: () => confirmDiscard(() => void openPlaylist(playlist)),
          }))
      : [{ kind: 'note', id: 'no-playlists', label: t('noSavedPlaylists') }];

  const items: MenuItem[] = [
    {
      kind: 'action',
      id: 'new',
      label: t('newPlaylist'),
      icon: ListPlus,
      onSelect: () => confirmDiscard(newPlaylist),
    },
    { kind: 'heading', id: 'saved-heading', label: t('savedPlaylists') },
    ...saved,
    { kind: 'separator', id: 'actions-separator' },
    {
      kind: 'action',
      id: 'save-copy',
      label: t('saveCopy'),
      icon: Copy,
      onSelect: savePlaylistCopy,
    },
    {
      kind: 'action',
      id: 'import',
      label: t('importPlaylist'),
      icon: FileDown,
      onSelect: () => confirmDiscard(() => void importPlaylistFile()),
    },
    {
      kind: 'action',
      id: 'export',
      label: t('exportPlaylist'),
      icon: FileUp,
      onSelect: () => void exportPlaylist(),
    },
    ...(current
      ? [
          {
            kind: 'action' as const,
            id: 'delete',
            label: t('deletePlaylist'),
            icon: Trash2,
            onSelect: () => deletePlaylist(current),
          },
        ]
      : []),
  ];

  return <Menu label={t('playlists')} icon={ListMusic} items={items} />;
};
