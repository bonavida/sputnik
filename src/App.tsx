import { useEffect } from 'react';
import { importPaths } from '@/app/actions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TitleBar } from '@/components/TitleBar';
import { NowPlaying } from '@/features/nowPlaying/NowPlaying';
import { PlayerBar } from '@/features/player/PlayerBar';
import { PlaylistHeader } from '@/features/playlists/PlaylistHeader';
import { DropOverlay } from '@/features/queue/DropOverlay';
import { NoticeBar } from '@/features/queue/NoticeBar';
import { Queue } from '@/features/queue/Queue';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocale } from '@/hooks/useT';

export const App = () => {
  const locale = useLocale();
  const isDropping = useFileDrop((paths) => void importPaths(paths));
  useAppTheme();
  useKeyboardShortcuts();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas text-fg transition-colors duration-500 motion-reduce:transition-none">
      <TitleBar />
      <main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 px-2 md:grid-cols-[clamp(16rem,38%,28rem)_minmax(0,1fr)] md:grid-rows-1">
        <NowPlaying />
        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-panel transition-colors duration-500 motion-reduce:transition-none">
          <PlaylistHeader />
          <NoticeBar />
          <Queue />
          {isDropping && <DropOverlay />}
        </section>
      </main>
      <PlayerBar />
      <ConfirmDialog />
    </div>
  );
};
