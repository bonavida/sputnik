import { useMemo } from 'react';
/** Context */
import useAudio from '@context/useAudio';
import usePlaylist from '@context/usePlaylist';
/** Utils */
import { processCover } from '@utils/common';
/** Components */
import Volume from './Volume';
/** Styles */
import './Details.scss';

const Details = () => {
  const { volume, isVolumeEnabled, updateVolume, toggleVolume } = useAudio();
  const { nowPlaying } = usePlaylist();
  const isPlaying = useMemo(
    () => !!Object.keys(nowPlaying ?? {}).length,
    [nowPlaying]
  );
  const { title, artist, album, cover } = useMemo(() => {
    const {
      title: songTitle,
      artist: songArtist,
      album: songAlbum,
    } = nowPlaying ?? {};
    return {
      title: songTitle,
      artist: songArtist,
      album: songAlbum,
      cover: processCover(nowPlaying ?? {}),
    };
  }, [nowPlaying]);

  return (
    <section className="details">
      <img
        className="details__cover"
        src={cover}
        alt={`Cover of the album ${album} by ${artist}`}
      />
      {isPlaying && (
        <div className="details__panel">
          <div className="details__info">
            <span className="details__title">{title}</span>
            <span className="details__artist">{artist}</span>
            <span className="details__album">{album}</span>
          </div>
          <Volume
            value={volume}
            isEnabled={isVolumeEnabled}
            onChange={(e) => updateVolume(e)}
            onToggle={() => toggleVolume(isVolumeEnabled)}
          />
        </div>
      )}
    </section>
  );
};

export default Details;
