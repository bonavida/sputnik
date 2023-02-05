/** Assets */
import DefaultCover from '@assets/default_cover.png';
import NotPlayingCover from '@assets/not_playing_cover.png';
/** Types */
import { SongMetadata } from '@customTypes/metadata';

const u8ToURL = (u8: Uint8Array) =>
  URL.createObjectURL(new Blob([u8.buffer], { type: 'image/png' }));

export const processCover = (nowPlaying: SongMetadata | {}) => {
  const isPlaying = !!Object.keys(nowPlaying).length;
  if (!isPlaying) return NotPlayingCover;
  const { cover } = nowPlaying as SongMetadata;
  return cover ? u8ToURL(cover) : DefaultCover;
};
