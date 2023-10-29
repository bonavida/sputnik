import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import PlaylistItem from '../PlaylistItem';
import type { PlaylistItemProps } from '../PlaylistItem';

const SortablePlaylistItem = ({ id, ...props }: PlaylistItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <PlaylistItem
      ref={setNodeRef}
      style={style}
      id={id}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
      {...props}
    />
  );
};

export default SortablePlaylistItem;
