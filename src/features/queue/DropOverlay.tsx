import { useT } from '@/hooks/useT';

export const DropOverlay = () => {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-canvas/90">
      <p className="text-lg font-medium text-accent">{t('dropHere')}</p>
    </div>
  );
};
