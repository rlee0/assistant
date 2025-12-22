import { create } from 'zustand';
import { UserSettings } from '@/types/settings';

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  isJsonView: boolean;
  
  // Actions
  setSettings: (settings: UserSettings) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  setLoading: (loading: boolean) => void;
  toggleJsonView: () => void;
  setJsonView: (isJson: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  isJsonView: false,
  
  setSettings: (settings) => set({ settings }),
  
  updateSettings: (updates) => set((state) => ({
    settings: state.settings ? { ...state.settings, ...updates } : updates as UserSettings,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleJsonView: () => set((state) => ({
    isJsonView: !state.isJsonView,
  })),
  
  setJsonView: (isJson) => set({ isJsonView: isJson }),
}));
