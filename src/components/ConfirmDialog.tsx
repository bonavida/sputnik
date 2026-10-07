import { useEffect, useId, useRef } from 'react';
import { useT } from '@/hooks/useT';
import { useUiStore } from '@/stores/uiStore';
import { Button } from './Button';

/**
 * Native modal <dialog>: focus trapping, Escape and the inert background come
 * from the browser. Cancel is focused first, the safe choice.
 */
export const ConfirmDialog = () => {
  const t = useT();
  const confirmation = useUiStore((state) => state.confirmation);
  const closeConfirmation = useUiStore((state) => state.closeConfirmation);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmation && !dialog.open) dialog.showModal();
    if (!confirmation && dialog.open) dialog.close();
  }, [confirmation]);

  const confirm = () => {
    confirmation?.onConfirm();
    closeConfirmation();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={closeConfirmation}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-canvas p-5 text-fg shadow-xl backdrop:bg-black/40"
    >
      {confirmation && (
        <>
          <h2 id={titleId} className="text-base font-medium">
            {confirmation.title}
          </h2>
          <p id={bodyId} className="mt-1 text-sm text-fg-muted">
            {confirmation.body}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button autoFocus onClick={closeConfirmation}>
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={confirm}>
              {confirmation.confirmLabel}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
};
