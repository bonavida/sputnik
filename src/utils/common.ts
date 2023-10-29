/** Assets */
import DefaultCover from '@assets/default_cover.png';
import NotPlayingCover from '@assets/not_playing_cover.png';
/** Types */
import { SongMetadata } from '@customTypes/metadata';
/** Constants */
import { VOLUME_ICON_KEY } from '@constants/common';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

const u8ToURL = (u8: Uint8Array) =>
  URL.createObjectURL(new Blob([u8.buffer], { type: 'image/png' }));

export const processCover = (nowPlaying: SongMetadata | {}) => {
  const isPlaying = !!Object.keys(nowPlaying).length;
  if (!isPlaying) return NotPlayingCover;
  const { cover } = nowPlaying as SongMetadata;
  return cover ? u8ToURL(cover) : DefaultCover;
};

export const getVolumeIcon = (volume: number, isEnabled: boolean): IconProp => {
  if (!volume || !isEnabled) return VOLUME_ICON_KEY.OFF as IconProp;
  return (
    volume < 0.5 ? VOLUME_ICON_KEY.LOW : VOLUME_ICON_KEY.HIGH
  ) as IconProp;
};

export const isNumber = (value: number | undefined) =>
  typeof value === 'number';
