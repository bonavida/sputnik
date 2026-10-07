import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AudioLines, CircleAlert, X } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { useT } from '@/hooks/useT';
import type { QueueEntry } from '@/lib/queue';
import { formatTime } from '@/lib/time';
import { usePlayerStore } from '@/stores/playerStore';

interface QueueRowProps {
  entry: QueueEntry;
  position: number;
  isCurrent: boolean;
  isSelected: boolean;
  isUnplayable: boolean;
}

export const rowId = (uid: string): string => `queue-row-${uid}`;

const player = () => usePlayerStore.getState();

export const QueueRow = ({
  entry,
  position,
  isCurrent,
  isSelected,
  isUnplayable,
}: QueueRowProps) => {
  const t = useT();
  const { uid, track } = entry;
  // Only the drag listeners are used: the row keeps its listbox option semantics
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: uid });

  const stateStyle = [
    isSelected ? 'bg-raised' : 'hover:bg-raised/60',
    isCurrent ? 'text-accent' : '',
    isUnplayable ? 'opacity-50' : '',
    isDragging ? 'relative z-10 shadow-lg' : '',
  ].join(' ');

  return (
    // Keys are handled for the whole listbox by useKeyboardShortcuts (aria-activedescendant pattern)
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={setNodeRef}
      id={rowId(uid)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see the listbox in Queue.tsx
      role="option"
      tabIndex={-1}
      aria-selected={isSelected}
      aria-current={isCurrent || undefined}
      {...listeners}
      onClick={() => player().select(uid)}
      onDoubleClick={() => player().playUid(uid)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group grid cursor-default select-none grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-canvas px-3 py-2 md:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_auto] ${stateStyle}`}
    >
      <span className="flex justify-end text-sm tabular-nums text-fg-muted">
        {isCurrent ? (
          <AudioLines
            aria-label={t('nowPlaying')}
            className="size-4 text-accent"
            strokeWidth={1.75}
          />
        ) : (
          position
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          {isUnplayable && (
            <CircleAlert
              aria-label={t('unplayable')}
              className="size-4 shrink-0"
              strokeWidth={1.75}
            />
          )}
          <span className="truncate font-medium">{track.title}</span>
        </span>
        <span className="block truncate text-sm text-fg-muted">
          {track.artist ?? t('unknownArtist')}
        </span>
      </span>
      <span className="hidden truncate text-sm text-fg-muted md:block">
        {track.album}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-10 text-right text-sm tabular-nums text-fg-muted">
          {formatTime(track.duration)}
        </span>
        {/* Mouse shortcut; keyboard users press Delete on the selected row */}
        <IconButton
          label={t('remove')}
          icon={X}
          size="sm"
          tabIndex={-1}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            player().remove([uid]);
          }}
          className="text-fg-muted opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100"
        />
      </span>
    </div>
  );
};
