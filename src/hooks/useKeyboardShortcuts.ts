import { useEffect } from 'react';
import {
  addSongs,
  exportPlaylist,
  savePlaylist,
  showInFolder,
} from '@/app/actions';
import { SEEK_STEP_SECONDS, usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

type Handler = () => void;

const player = () => usePlayerStore.getState();

const SHORTCUTS: Record<string, Handler> = {
  ' ': () => player().togglePlay(),
  arrowleft: () => player().seekBy(-SEEK_STEP_SECONDS),
  arrowright: () => player().seekBy(SEEK_STEP_SECONDS),
  arrowup: () => player().selectPrevious(),
  arrowdown: () => player().selectNext(),
  enter: () => player().playSelected(),
  delete: () => player().removeSelected(),
  backspace: () => player().removeSelected(),
  m: () => player().toggleMute(),
  s: () => player().toggleShuffle(),
  r: () => player().cycleRepeat(),
};

const ALT_SHORTCUTS: Record<string, Handler> = {
  arrowup: () => player().moveSelected(-1),
  arrowdown: () => player().moveSelected(1),
  // Like "Properties" on Windows: about the selected file
  enter: () => showInFolder(),
};

// Ctrl on Windows/Linux, Cmd on macOS
const COMMAND_SHORTCUTS: Record<string, Handler> = {
  o: () => void addSongs(),
  s: () => savePlaylist(),
  e: () => void exportPlaylist(),
};

const TEXT_INPUTS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
// Space and Enter already activate these natively
const NATIVE_ACTIVATION = new Set(['BUTTON', 'A', 'SUMMARY']);

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || TEXT_INPUTS.has(target.tagName));

const activatesNatively = (target: EventTarget | null, key: string) =>
  (key === ' ' || key === 'enter') &&
  target instanceof HTMLElement &&
  NATIVE_ACTIVATION.has(target.tagName);

const handlerFor = (event: KeyboardEvent): Handler | undefined => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) return COMMAND_SHORTCUTS[key];
  if (event.altKey) return ALT_SHORTCUTS[key];
  return SHORTCUTS[key];
};

/** One window-level listener for every shortcut; handlers read the stores directly */
export const useKeyboardShortcuts = (): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Menus and dialogs handle their own keys
      if (event.defaultPrevented || useUiStore.getState().confirmation) return;
      if (
        isTyping(event.target) ||
        activatesNatively(event.target, event.key.toLowerCase())
      )
        return;
      const handler = handlerFor(event);
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
