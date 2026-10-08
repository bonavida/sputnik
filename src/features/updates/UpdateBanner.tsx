import { CircleArrowDown, X } from 'lucide-react';
import {
  installUpdate,
  openUpdateDownload,
  openUpdateNotes,
  skipUpdate,
} from '@/app/updates';
import { useLocale, useT } from '@/hooks/useT';
import { useUpdateStore } from '@/stores/updateStore';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';

const BYTES_PER_MB = 1_000_000;

/** A newer Sputnik is available: install it (Windows) or download it */
export const UpdateBanner = () => {
  const t = useT();
  const locale = useLocale();
  const available = useUpdateStore((state) => state.status?.available);
  const isInstalling = useUpdateStore(
    (state) => state.status?.isInstalling ?? false
  );
  const dismissedVersion = useUpdateStore((state) => state.dismissedVersion);

  if (!available || available.version === dismissedVersion) return null;

  const { version, size, canInstall } = available;
  const sizeText =
    size === undefined
      ? undefined
      : new Intl.NumberFormat(locale, {
          style: 'unit',
          unit: 'megabyte',
          maximumFractionDigits: 0,
        }).format(size / BYTES_PER_MB);

  return (
    <section
      aria-label={t('updateAvailable', { version })}
      className="mx-2 mb-2 rounded-xl bg-raised px-3 py-2 text-sm md:mx-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CircleArrowDown
          aria-hidden="true"
          className="size-4 shrink-0 text-accent"
          strokeWidth={1.75}
        />
        <p aria-live="polite" className="min-w-0 flex-1 font-medium">
          {isInstalling
            ? t('updateDownloading', { version, size: sizeText ?? '' })
            : t('updateAvailable', { version })}
        </p>
        {!isInstalling && (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="primary"
              className="h-8 px-3"
              onClick={
                canInstall ? () => void installUpdate() : openUpdateDownload
              }
            >
              {canInstall ? t('updateInstall') : t('updateDownload')}
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3"
              onClick={openUpdateNotes}
            >
              {t('updateNotes')}
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3 text-fg-muted"
              onClick={() => void skipUpdate()}
            >
              {t('updateSkip')}
            </Button>
            <IconButton
              label={t('dismiss')}
              icon={X}
              size="sm"
              onClick={() => useUpdateStore.getState().dismiss(version)}
            />
          </div>
        )}
      </div>
    </section>
  );
};
