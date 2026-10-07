import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CircleAlert, X } from 'lucide-react';
import { CoverArt } from '@/components/CoverArt';
import { IconButton } from '@/components/IconButton';
import { useT } from '@/hooks/useT';
import type { QueueEntry } from '@/lib/queue';
import { formatTime } from '@/lib/time';
import { usePlayerStore } from '@/stores/playerStore';
import { PlayingBars } from './PlayingBars';

interface QueueRowProps {
  entry: QueueEntry;
  position: number;
  isCurrent: boolean;
  /** Only meaningful for the current row */
  isPlaying: boolean;
  isSelected: boolean;
  isUnplayable: boolean;
}

export const rowId = (uid: string): string => `queue-row-${uid}`;

// Shared with QueueHeader: every row is its own grid, so columns align only if
// all of them use fixed or fractional tracks (the last one fits duration + remove)
export const ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-3 px-3 @2xl:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_4.5rem]';

const player = () => usePlayerStore.getState();

// One background per state: a dragged row must be opaque over the others
const rowBackground = (
  isDragging: boolean,
  isSelected: boolean,
  isCurrent: boolean
) => {
  if (isDragging || isSelected) return 'bg-raised';
  if (isCurrent) return 'bg-raised/50';
  return 'hover:bg-raised/60';
};

export const QueueRow = ({
  entry,
  position,
  isCurrent,
  isPlaying,
  isSelected,
  isUnplayable,
}: QueueRowProps) => {
  const t = useT();
  const { uid, track } = entry;
  // Only the drag listeners are used: the row keeps its listbox option semantics
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: uid });

  const stateStyle = [
    rowBackground(isDragging, isSelected, isCurrent),
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
      className={`${ROW_GRID} group cursor-default select-none rounded-lg py-2 ${stateStyle}`}
    >
      <span className="flex justify-end text-sm tabular-nums text-fg-muted">
        {isCurrent ? (
          <>
            {/* Hovering the row shows its number instead of the bars */}
            <PlayingBars
              isPlaying={isPlaying}
              label={isPlaying ? t('nowPlaying') : t('nowPaused')}
              className="group-hover:hidden"
            />
            <span className="hidden text-accent group-hover:inline">
              {position}
            </span>
          </>
        ) : (
          position
        )}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <CoverArt url={track.coverUrl} isLazy className="size-10" />
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
      </span>
      <span className="hidden truncate text-sm text-fg-muted @2xl:block">
        {track.album}
      </span>
      <span className="flex items-center justify-end gap-1">
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
