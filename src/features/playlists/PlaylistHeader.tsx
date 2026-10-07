import { Save } from 'lucide-react';
import { savePlaylist } from '@/app/actions';
import { IconButton } from '@/ui/IconButton';
import { useT } from '@/hooks/useT';
import type { Translate } from '@/i18n/t';
import { formatTotal } from '@/utils/time';
import { usePlayerStore } from '@/stores/playerStore';
import { hasUnsavedChanges, usePlaylistsStore } from '@/stores/playlistsStore';
import { useUiStore } from '@/stores/uiStore';
import { AddMenu } from './AddMenu';
import { PlaylistsMenu } from './PlaylistsMenu';
import { PlaylistTitle } from './PlaylistTitle';

const summaryOf = (
  t: Translate,
  isImporting: boolean,
  count: number,
  seconds: number
) => {
  if (isImporting) return t('adding');
  if (count === 0) return '';
  return `${t('tracks', { count })} · ${formatTotal(seconds)}`;
};

export const PlaylistHeader = () => {
  const t = useT();
  const entries = usePlayerStore((state) => state.queue.entries);
  const playlists = usePlaylistsStore((state) => state.playlists);
  const currentId = usePlaylistsStore((state) => state.currentId);
  const isImporting = useUiStore((state) => state.isImporting);

  const tracks = entries.map(({ track }) => track);
  const isDirty = hasUnsavedChanges({ playlists, currentId }, tracks);
  const totalSeconds = tracks.reduce((sum, { duration }) => sum + duration, 0);

  return (
    <header className="flex flex-wrap items-center gap-x-3 px-4 pb-2 pt-3 md:px-6 md:pt-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <PlaylistTitle />
        {isDirty && (
          <span title={t('unsavedChanges')} className="flex shrink-0">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-accent"
            />
            <span className="sr-only">{t('unsavedChanges')}</span>
          </span>
        )}
      </div>
      <div className="flex items-center">
        <AddMenu />
        <IconButton label={t('save')} icon={Save} onClick={savePlaylist} />
        <PlaylistsMenu />
      </div>
      <p aria-live="polite" className="w-full text-sm text-fg-muted">
        {summaryOf(t, isImporting, tracks.length, totalSeconds)}
      </p>
    </header>
  );
};
