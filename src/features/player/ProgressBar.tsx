import { Slider } from '@/components/Slider';
import { useT } from '@/hooks/useT';
import { formatTime } from '@/lib/time';
import { usePlayerStore } from '@/stores/playerStore';

const SEEK_STEP = 0.1;

/** The only component that re-renders on every `timeupdate` */
export const ProgressBar = () => {
  const t = useT();
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const hasTrack = usePlayerStore(
    (state) => state.queue.currentUid !== undefined
  );
  const seek = usePlayerStore((state) => state.seek);
  const current = formatTime(position);
  const total = formatTime(duration);

  return (
    <div className="flex w-full items-center gap-1.5 text-xs tabular-nums text-fg-muted">
      <span className="w-10 text-right">{current}</span>
      <Slider
        label={t('position')}
        value={position}
        max={duration}
        step={SEEK_STEP}
        valueText={t('timeOf', { current, total })}
        formatPreview={formatTime}
        onChange={seek}
        disabled={!hasTrack}
        className="flex-1"
      />
      <span className="w-10">{total}</span>
    </div>
  );
};
