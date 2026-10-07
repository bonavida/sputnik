import { FolderPlus, ListMusic, Plus } from 'lucide-react';
import { addFolder, addSongs } from '@/app/actions';
import { Button } from '@/components/Button';
import { useT } from '@/hooks/useT';

export const EmptyQueue = () => {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-10 text-center">
      <ListMusic
        aria-hidden="true"
        strokeWidth={1.25}
        className="size-10 text-fg-muted"
      />
      <h3 className="font-medium">{t('emptyTitle')}</h3>
      <p className="max-w-xs text-sm text-fg-muted">{t('emptyBody')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => void addSongs()}>
          <Plus aria-hidden="true" className="size-4" />
          {t('addSongs')}
        </Button>
        <Button onClick={() => void addFolder()}>
          <FolderPlus aria-hidden="true" className="size-4" />
          {t('addFolder')}
        </Button>
      </div>
    </div>
  );
};
