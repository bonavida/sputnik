import { FolderPlus, Music, Plus } from 'lucide-react';
import { addFolder, addSongs } from '@/app/actions';
import { Menu } from '@/ui/Menu';
import { useT } from '@/hooks/useT';

export const AddMenu = () => {
  const t = useT();
  return (
    <Menu
      label={t('add')}
      icon={Plus}
      items={[
        {
          kind: 'action',
          id: 'songs',
          label: t('addSongs'),
          icon: Music,
          onSelect: () => void addSongs(),
        },
        {
          kind: 'action',
          id: 'folder',
          label: t('addFolder'),
          icon: FolderPlus,
          onSelect: () => void addFolder(),
        },
      ]}
    />
  );
};
