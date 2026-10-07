import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import type { ImportFailureReason } from '@shared/types';
import { IconButton } from '@/components/IconButton';
import { useT } from '@/hooks/useT';
import type { Translate, TranslationKey } from '@/i18n/t';
import type { Notice } from '@/stores/uiStore';
import { useUiStore } from '@/stores/uiStore';

const AUTO_DISMISS_MS = 3_000;

const REASONS: Record<ImportFailureReason, TranslationKey> = {
  unsupported: 'reasonUnsupported',
  unreadable: 'reasonUnreadable',
  missing: 'reasonMissing',
};

interface Detail {
  path: string;
  reason?: string;
}

const fileName = (path: string) => path.split(/[\\/]/).at(-1) ?? path;

const describe = (
  notice: Notice,
  t: Translate
): { message: string; details: Detail[] } => {
  if (notice.kind === 'failedFiles') {
    return {
      message: t('failedFiles', { count: notice.failures.length }),
      details: notice.failures.map(({ path, reason }) => ({
        path,
        reason: t(REASONS[reason]),
      })),
    };
  }
  if (notice.kind === 'missingTracks') {
    return {
      message: t('missingTracks', { count: notice.paths.length }),
      details: notice.paths.map((path) => ({ path })),
    };
  }
  return { message: t('exported'), details: [] };
};

const NoticeContent = ({ notice }: { notice: Notice }) => {
  const t = useT();
  const dismiss = useUiStore((state) => state.dismissNotice);
  const [isExpanded, setIsExpanded] = useState(false);
  const { message, details } = describe(notice, t);
  const isSuccess = notice.kind === 'exported';
  const Icon = isSuccess ? CircleCheck : CircleAlert;

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, dismiss]);

  return (
    <div className="mx-2 mb-2 rounded-xl bg-raised px-3 py-2 text-sm md:mx-4">
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
        <p className="flex-1">{message}</p>
        {details.length > 0 && (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="cursor-pointer rounded-md px-2 py-1 text-fg-muted underline-offset-2 hover:underline"
          >
            {isExpanded ? t('hideDetails') : t('showDetails')}
          </button>
        )}
        <IconButton label={t('dismiss')} icon={X} size="sm" onClick={dismiss} />
      </div>
      {isExpanded && (
        <ul className="mt-2 max-h-32 overflow-y-auto pl-6 text-xs text-fg-muted">
          {details.map(({ path, reason }) => (
            <li key={path} title={path} className="truncate">
              {reason ? `${fileName(path)}: ${reason}` : fileName(path)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Feedback for imports, missing files and exports. Announced to screen readers */
export const NoticeBar = () => {
  const notice = useUiStore((state) => state.notice);
  return (
    <div aria-live="polite">
      {notice && <NoticeContent key={notice.id} notice={notice} />}
    </div>
  );
};
