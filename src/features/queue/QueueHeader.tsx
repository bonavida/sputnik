import { ChevronDown, ChevronUp, Clock3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { sortQueue } from '@/app/actions';
import { useLocale, useT } from '@/hooks/useT';
import { usePlayerStore } from '@/stores/playerStore';
import { sortOrderOf } from '@/utils/trackSort';
import type { SortKey, SortOrder } from '@/utils/trackSort';
import { ROW_GRID } from './QueueRow';

interface SortButtonProps {
  sortKey: SortKey;
  /** Column name, used in the accessible label */
  column: string;
  order?: SortOrder;
  className?: string;
  children: ReactNode;
}

const SortButton = ({
  sortKey,
  column,
  order,
  className = '',
  children,
}: SortButtonProps) => {
  const t = useT();
  const locale = useLocale();
  const direction = order?.key === sortKey ? order.direction : undefined;
  const Arrow = direction === 'descending' ? ChevronDown : ChevronUp;
  const label = t('sortBy', { column: column.toLocaleLowerCase(locale) });

  return (
    <button
      type="button"
      aria-label={
        direction
          ? `${label} (${t(direction === 'ascending' ? 'sortAscending' : 'sortDescending')})`
          : label
      }
      title={label}
      onClick={() => sortQueue(sortKey, locale)}
      className={`no-drag inline-flex cursor-pointer items-center gap-0.5 rounded-md hover:text-fg ${direction ? 'text-fg' : ''} ${className}`}
    >
      {children}
      {direction && (
        <Arrow aria-hidden="true" className="size-3.5" strokeWidth={2} />
      )}
    </button>
  );
};

/**
 * Column titles above the list; clicking one sorts the list by it. It sits
 * outside the scrolling listbox (which may only contain options), reserving
 * the same scrollbar gutter so the columns line up with the rows.
 */
export const QueueHeader = () => {
  const t = useT();
  const locale = useLocale();
  const entries = usePlayerStore((state) => state.queue.entries);
  const order = sortOrderOf(
    entries.map(({ track }) => track),
    locale
  );

  return (
    <div className="@container overflow-y-hidden px-2 scrollbar-gutter-stable md:px-4">
      <div
        className={`${ROW_GRID} border-b border-line py-2 text-xs font-medium text-fg-muted`}
      >
        <span aria-hidden="true" className="text-right">
          {t('columnNumber')}
        </span>
        <span>
          <SortButton sortKey="title" column={t('columnTitle')} order={order}>
            {t('columnTitle')}
          </SortButton>
        </span>
        <span className="hidden @2xl:block">
          <SortButton sortKey="album" column={t('columnAlbum')} order={order}>
            {t('columnAlbum')}
          </SortButton>
        </span>
        <span className="flex justify-end pr-16">
          <SortButton
            sortKey="duration"
            column={t('columnDuration')}
            order={order}
          >
            <Clock3 aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </SortButton>
        </span>
      </div>
    </div>
  );
};
