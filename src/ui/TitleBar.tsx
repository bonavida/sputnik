import { SettingsMenu } from '@/features/settings/SettingsMenu';
import { useT } from '@/hooks/useT';
import { bridge } from '@/bridge/bridge';

/**
 * Frameless title bar: drags the window and leaves room for the native window
 * controls (right on Windows/Linux, traffic lights on the left on macOS).
 */
export const TitleBar = () => {
  const t = useT();
  const isMac = bridge().platform === 'darwin';

  return (
    <header
      className={`title-bar drag-region flex h-10 shrink-0 items-center gap-2 ${isMac ? 'pl-20' : 'pl-4'}`}
    >
      <span className="flex-1 text-xs font-medium tracking-wide text-fg-muted">
        {t('appName')}
      </span>
      <SettingsMenu />
    </header>
  );
};
