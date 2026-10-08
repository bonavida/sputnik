import { bridge } from '@/bridge/bridge';
import { useUiStore } from '@/stores/uiStore';
import { useUpdateStore } from '@/stores/updateStore';

// Reading the status is local (the main process checks GitHub on its own
// schedule), so polling it costs nothing
const STATUS_POLL_MS = 60_000;

const updates = () => useUpdateStore.getState();

export const loadUpdateStatus = async (): Promise<void> => {
  try {
    updates().setStatus(await bridge().updatesStatus());
  } catch {
    // No update notices; the app works the same
  }
};

const refresh = () => void loadUpdateStatus();

/** Picks up what background checks find. Returns a function that stops it */
export const watchUpdates = (): (() => void) => {
  const timer = setInterval(refresh, STATUS_POLL_MS);
  window.addEventListener('focus', refresh);
  return () => {
    clearInterval(timer);
    window.removeEventListener('focus', refresh);
  };
};

export const checkForUpdates = async (): Promise<void> => {
  const ui = useUiStore.getState();
  const { status } = updates();
  if (status) updates().setStatus({ ...status, isChecking: true });
  const result = await bridge()
    .updatesCheck()
    .catch(() => 'failed' as const);
  await loadUpdateStatus();
  const version = updates().status?.currentVersion ?? '';
  if (result === 'up-to-date') ui.showNotice({ kind: 'upToDate', version });
  if (result === 'failed') ui.showNotice({ kind: 'updateCheckFailed' });
};

export const installUpdate = async (): Promise<void> => {
  const ui = useUiStore.getState();
  const { status } = updates();
  if (status) updates().setStatus({ ...status, isInstalling: true });
  const result = await bridge()
    .updatesInstall()
    .catch(() => 'failed' as const);
  // On success the app closes and the installer takes over
  await loadUpdateStatus();
  if (result === 'verification-failed' || result === 'failed')
    ui.showNotice({ kind: 'updateInstallFailed', reason: result });
};

export const openUpdateDownload = (): void => {
  void bridge().updatesOpenDownload();
};

export const openUpdateNotes = (): void => {
  void bridge().updatesOpenNotes();
};

export const skipUpdate = async (): Promise<void> => {
  updates().setStatus(await bridge().updatesSkip());
};

export const setAutomaticUpdates = async (
  isEnabled: boolean
): Promise<void> => {
  updates().setStatus(await bridge().updatesSetAutomatic(isEnabled));
};
