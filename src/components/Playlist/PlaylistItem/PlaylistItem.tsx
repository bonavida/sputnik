import { MouseEvent } from 'react';
import cx from 'classnames';
/** Types */
import { DraggableEvent } from '@customTypes/playlist';
import { SongMetadata } from '@customTypes/metadata';
/** Styles */
import './PlaylistItem.scss';

interface PlaylistItemProps extends Omit<SongMetadata, 'id' | 'cover'> {
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  onDragStart: (e: DraggableEvent<HTMLDivElement>) => void;
  onDragEnter: (e: DraggableEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DraggableEvent<HTMLDivElement>) => void;
  onDragOver: (e: DraggableEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DraggableEvent<HTMLDivElement>) => void;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
}

const PlaylistItem = ({
  title,
  artist,
  album,
  duration,
  index,
  isSelected,
  isPlaying,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDragEnd,
  onClick,
}: PlaylistItemProps) => {
  const itemClasses = cx({
    playlist__row: true,
    'playlist__row--selected': isSelected,
    'playlist__row--playing': isPlaying,
  });
  return (
    <li className="playlist__row-wrapper">
      <div
        role="button"
        tabIndex={0}
        className={itemClasses}
        draggable
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onClick={onClick}
      >
        <span>{index + 1}</span>
        <span>{title}</span>
        <span>{artist}</span>
        <span>{album}</span>
        <span>{duration}</span>
      </div>
    </li>
  );
};

export default PlaylistItem;
