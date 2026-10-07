import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, Modifier } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEffect } from 'react';
import { useT } from '@/hooks/useT';
import { usePlayerStore } from '@/stores/playerStore';
import { EmptyQueue } from './EmptyQueue';
import { QueueRow, rowId } from './QueueRow';

// Small threshold so clicks and double clicks are not taken as drags
const DRAG_DISTANCE_PX = 5;

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const onDragEnd = ({ active, over }: DragEndEvent) => {
  if (over && active.id !== over.id)
    usePlayerStore.getState().move(String(active.id), String(over.id));
};

/** Listbox of the queue: drag to reorder, double click or Enter to play */
export const Queue = () => {
  const t = useT();
  const entries = usePlayerStore((state) => state.queue.entries);
  const currentUid = usePlayerStore((state) => state.queue.currentUid);
  const selectedUid = usePlayerStore((state) => state.selectedUid);
  const unplayable = usePlayerStore((state) => state.unplayable);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_DISTANCE_PX },
    })
  );

  // Keep the selected row visible while moving through the list with the keyboard
  useEffect(() => {
    if (selectedUid)
      document
        .getElementById(rowId(selectedUid))
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedUid]);

  if (entries.length === 0) return <EmptyQueue />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={entries.map(({ uid }) => uid)}
        strategy={verticalListSortingStrategy}
      >
        <div
          // WAI-ARIA listbox: a native <select> cannot hold rich, draggable rows
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="listbox"
          aria-label={t('playlist')}
          aria-activedescendant={selectedUid ? rowId(selectedUid) : undefined}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 md:px-4"
        >
          {entries.map((entry, index) => (
            <QueueRow
              key={entry.uid}
              entry={entry}
              position={index + 1}
              isCurrent={entry.uid === currentUid}
              isSelected={entry.uid === selectedUid}
              isUnplayable={unplayable.includes(entry.track.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
