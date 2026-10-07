import { CoverArt } from '@/components/CoverArt';
import { useT } from '@/hooks/useT';
import { currentTrack, usePlayerStore } from '@/stores/playerStore';

/**
 * Large cover and track details. On narrow windows it collapses into a
 * compact row above the playlist.
 */
export const NowPlaying = () => {
  const t = useT();
  const track = usePlayerStore(currentTrack);

  return (
    <section
      aria-label={t('nowPlaying')}
      className="flex items-center gap-4 border-b border-line px-4 py-3 md:flex-col md:items-stretch md:gap-5 md:border-b-0 md:p-6"
    >
      <CoverArt
        url={track?.coverUrl}
        className="w-16 md:w-full md:rounded-2xl"
      />
      <div className="min-w-0">
        <h2 className="truncate text-base font-medium md:line-clamp-2 md:whitespace-normal md:text-xl">
          {track?.title ?? t('nothingPlaying')}
        </h2>
        <p className="truncate text-sm text-fg-muted md:mt-1 md:text-base">
          {track
            ? (track.artist ?? t('unknownArtist'))
            : t('nothingPlayingHint')}
        </p>
        {track && (
          <p className="hidden truncate text-sm text-fg-muted md:block">
            {track.album ?? t('unknownAlbum')}
          </p>
        )}
      </div>
    </section>
  );
};
