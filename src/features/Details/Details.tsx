/** Context */
import useAudio from '@context/useAudio';
import { useMemo } from 'react';
/** Utils */
import { processCover } from '@utils/common';
/** Styles */
import './Details.scss';

const Details = () => {
  const { nowPlaying } = useAudio();
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
        <div className="details__info">
          <span className="details__title">{title}</span>
          <span className="details__artist">{artist}</span>
          <span className="details__album">{album}</span>
        </div>
      )}
    </section>
  );
};

export default Details;
