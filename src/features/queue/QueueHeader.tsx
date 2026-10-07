import { Clock3 } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { ROW_GRID } from './QueueRow';

/**
 * Column titles, sticky while the list scrolls. Hidden from assistive
 * technology: each option already reads its own title, album and duration, and
 * a listbox can only contain options.
 */
export const QueueHeader = () => {
  const t = useT();

  return (
    <div
      aria-hidden="true"
      className={`${ROW_GRID} sticky top-0 z-10 mb-1 border-b border-line bg-panel py-2 text-xs font-medium text-fg-muted transition-colors duration-500 motion-reduce:transition-none`}
    >
      <span className="text-right">{t('columnNumber')}</span>
      <span>{t('columnTitle')}</span>
      <span className="hidden @2xl:block">{t('columnAlbum')}</span>
      <span title={t('columnDuration')} className="flex justify-end pr-8">
        <Clock3 className="size-4" strokeWidth={1.75} />
      </span>
    </div>
  );
};
