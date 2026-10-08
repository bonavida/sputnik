import { create } from 'zustand';
import type { ImportFailure } from '@shared/types';

export type Notice =
  | { kind: 'failedFiles'; failures: ImportFailure[] }
  | { kind: 'missingTracks'; paths: string[] }
  | { kind: 'exported' }
  | { kind: 'lastfmConnected'; user: string }
  | { kind: 'lastfmFailed'; reason: 'timed-out' | 'failed' };

export interface Confirmation {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface UiState {
  isImporting: boolean;
  /** `id` changes with every notice, so a repeated one resets its UI state */
  notice?: Notice & { id: number };
  confirmation?: Confirmation;
  setImporting: (isImporting: boolean) => void;
  showNotice: (notice: Notice) => void;
  dismissNotice: () => void;
  requestConfirmation: (confirmation: Confirmation) => void;
  closeConfirmation: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  isImporting: false,
  setImporting: (isImporting) => set({ isImporting }),
  showNotice: (notice) =>
    set({ notice: { ...notice, id: (get().notice?.id ?? 0) + 1 } }),
  dismissNotice: () => set({ notice: undefined }),
  requestConfirmation: (confirmation) => set({ confirmation }),
  closeConfirmation: () => set({ confirmation: undefined }),
}));
