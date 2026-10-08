import { create } from 'zustand';
import type { UpdateStatus } from '@shared/types';

interface UpdateState {
  /** As reported by the main process; undefined until the first answer */
  status?: UpdateStatus;
  /** Version whose notice was closed in this session (it comes back next start) */
  dismissedVersion?: string;
  setStatus: (status: UpdateStatus) => void;
  dismiss: (version: string) => void;
}

export const useUpdateStore = create<UpdateState>()((set) => ({
  setStatus: (status) => set({ status }),
  dismiss: (dismissedVersion) => set({ dismissedVersion }),
}));
