import { create } from 'zustand';
import type { LastfmStatus } from '@shared/types';

interface LastfmState {
  /** As reported by the main process, which owns the account */
  status: LastfmStatus;
  /** Waiting for the user to approve Sputnik on last.fm */
  isConnecting: boolean;
  setStatus: (status: LastfmStatus) => void;
  setConnecting: (isConnecting: boolean) => void;
}

export const useLastfmStore = create<LastfmState>()((set) => ({
  status: { isAvailable: false, isEnabled: true, pending: 0 },
  isConnecting: false,
  setStatus: (status) => set({ status }),
  setConnecting: (isConnecting) => set({ isConnecting }),
}));
