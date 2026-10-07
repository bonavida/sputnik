import { Volume1, Volume2, VolumeX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from '@/ui/IconButton';
import { Slider } from '@/ui/Slider';
import { useLocale, useT } from '@/hooks/useT';
import { usePlayerStore } from '@/stores/playerStore';

const VOLUME_STEP = 0.01;
const LOW_VOLUME = 0.5;

const volumeIcon = (volume: number, muted: boolean): LucideIcon => {
  if (muted || volume === 0) return VolumeX;
  return volume < LOW_VOLUME ? Volume1 : Volume2;
};

export const VolumeControl = ({ className = '' }: { className?: string }) => {
  const t = useT();
  const locale = useLocale();
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const level = muted ? 0 : volume;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <IconButton
        label={muted ? t('unmute') : t('mute')}
        icon={volumeIcon(volume, muted)}
        onClick={toggleMute}
        className="text-fg-muted"
      />
      <div className="hidden w-24 sm:block">
        <Slider
          label={t('volume')}
          value={level}
          max={1}
          step={VOLUME_STEP}
          valueText={new Intl.NumberFormat(locale, {
            style: 'percent',
          }).format(level)}
          onChange={setVolume}
        />
      </div>
    </div>
  );
};
