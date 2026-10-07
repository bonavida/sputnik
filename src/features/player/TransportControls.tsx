import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RepeatMode } from '@shared/types';
import { IconButton } from '@/components/IconButton';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n/t';
import { usePlayerStore } from '@/stores/playerStore';

const REPEAT: Record<RepeatMode, { label: TranslationKey; icon: LucideIcon }> =
  {
    off: { label: 'repeatOff', icon: Repeat },
    all: { label: 'repeatAll', icon: Repeat },
    one: { label: 'repeatOne', icon: Repeat1 },
  };

// Actions are read when the event fires, never during render
const player = () => usePlayerStore.getState();

// Active toggles get the accent color and a dot below, like the old design
const toggleStyle = (isActive: boolean) =>
  isActive
    ? 'relative text-accent after:absolute after:bottom-0.5 after:size-1 after:rounded-full after:bg-accent'
    : 'text-fg-muted';

export const TransportControls = () => {
  const t = useT();
  const isPlaying = usePlayerStore((state) => state.status === 'playing');
  const shuffle = usePlayerStore((state) => state.queue.shuffle);
  const repeat = usePlayerStore((state) => state.queue.repeat);

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <IconButton
        label={t('shuffle')}
        icon={Shuffle}
        isPressed={shuffle}
        onClick={() => player().toggleShuffle()}
        className={toggleStyle(shuffle)}
      />
      <IconButton
        label={t('previous')}
        icon={SkipBack}
        onClick={() => player().previous()}
      />
      <IconButton
        label={isPlaying ? t('pause') : t('play')}
        icon={isPlaying ? Pause : Play}
        size="lg"
        onClick={() => player().togglePlay()}
        className="bg-fg text-canvas hover:bg-fg hover:opacity-90 [&_svg]:fill-current"
      />
      <IconButton
        label={t('next')}
        icon={SkipForward}
        onClick={() => player().next()}
      />
      <IconButton
        label={t(REPEAT[repeat].label)}
        icon={REPEAT[repeat].icon}
        isPressed={repeat !== 'off'}
        onClick={() => player().cycleRepeat()}
        className={toggleStyle(repeat !== 'off')}
      />
    </div>
  );
};
