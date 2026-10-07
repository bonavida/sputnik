import { CoverArt } from '@/components/CoverArt';
import { useT } from '@/hooks/useT';
import { currentTrack, usePlayerStore } from '@/stores/playerStore';

/**
 * Large cover and track details, centered in their column. On narrow windows it
 * collapses into a compact row above the playlist.
 */
export const NowPlaying = () => {
  const t = useT();
  const track = usePlayerStore(currentTrack);

  return (
    <section
      aria-label={t('nowPlaying')}
      className="flex items-center gap-4 rounded-xl bg-panel px-4 py-3 transition-colors duration-500 motion-reduce:transition-none md:justify-center md:p-8"
    >
      {/* As wide as the column allows while cover and text fit the window height;
          on narrow windows it leaves the layout and the cover sits beside the text */}
      <div className="contents md:block md:w-[min(100%,calc(100dvh_-_20rem))]">
        <CoverArt
          url={track?.coverUrl}
          className="w-16 shadow-sm md:w-full md:rounded-2xl md:shadow-xl"
        />
        <div className="min-w-0 md:mt-6">
          <h2 className="truncate text-base font-medium md:line-clamp-2 md:whitespace-normal md:text-2xl md:font-semibold md:leading-tight">
            {track?.title ?? t('nothingPlaying')}
          </h2>
          {/* Title, then the artist in the cover's accent, then the album, quieter */}
          <p
            className={`truncate text-sm md:mt-1.5 md:text-lg ${track ? 'font-medium text-accent' : 'text-fg-muted'}`}
          >
            {track
              ? (track.artist ?? t('unknownArtist'))
              : t('nothingPlayingHint')}
          </p>
          {track && (
            <p className="hidden truncate text-sm text-fg-muted md:mt-0.5 md:block">
              {track.album ?? t('unknownAlbum')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
