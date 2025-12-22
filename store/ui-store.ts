import { create } from 'zustand';

interface UIState {
  isSettingsOpen: boolean;
  activeToast: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  activeToast: null,
  
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  
  showToast: (message, type) => set({ activeToast: { message, type } }),
  hideToast: () => set({ activeToast: null }),
}));
