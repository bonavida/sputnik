/** Types */
import { DraggableEvent } from '@customTypes/playlist';
import { SongMetadata } from '@customTypes/metadata';
/** Styles */
import './PlaylistItem.scss';

interface PlaylistItemProps extends Omit<SongMetadata, 'id' | 'cover'> {
  index: number;
  onDragStart: (e: DraggableEvent<HTMLLIElement>, index: number) => void;
  onDragEnter: (e: DraggableEvent<HTMLLIElement>, index: number) => void;
  onDragLeave: (e: DraggableEvent<HTMLLIElement>, index: number) => void;
  onDragOver: (e: DraggableEvent<HTMLLIElement>) => void;
  onDragEnd: (e: DraggableEvent<HTMLLIElement>) => void;
}

const PlaylistItem = ({
  title,
  artist,
  album,
  duration,
  index,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDragEnd,
}: PlaylistItemProps) => {
  return (
    <li
      className="playlist__row"
      draggable
      onDragStart={(e: DraggableEvent<HTMLLIElement>) => onDragStart(e, index)}
      onDragEnter={(e: DraggableEvent<HTMLLIElement>) => onDragEnter(e, index)}
      onDragLeave={(e: DraggableEvent<HTMLLIElement>) => onDragLeave(e, index)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <span>{index + 1}</span>
      <span>{title}</span>
      <span>{artist}</span>
      <span>{album}</span>
      <span>{duration}</span>
    </li>
  );
};

export default PlaylistItem;
