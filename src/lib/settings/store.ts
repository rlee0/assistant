import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Settings, settingsSchema, defaultSettings } from "./schema";
import { logError } from "@/lib/logging";

/**
 * Settings Store
 *
 * Manages user settings with localStorage persistence and validation.
 * Settings are synced with the server via the useSettingsSync hook.
 */

interface SettingsStore {
  settings: Settings;
  isLoaded: boolean;

  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  setSettings: (settings: Settings) => void;
  resetSettings: () => void;
  reset: () => void; // Alias for resetSettings for backward compatibility
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isLoaded: false,

      updateSettings: (updates) =>
        set((state) => {
          try {
            // Deep merge updates with existing settings
            const merged = {
              appearance: { ...state.settings.appearance, ...updates.appearance },
              chat: { ...state.settings.chat, ...updates.chat },
              suggestions: { ...state.settings.suggestions, ...updates.suggestions },
            };

            // Validate merged settings
            const validated = settingsSchema.parse(merged);

            return { settings: validated };
          } catch (error) {
            logError("Settings", "Failed to update settings", error);
            return state;
          }
        }),

      setSettings: (settings) =>
        set(() => {
          try {
            const validated = settingsSchema.parse(settings);
            return { settings: validated, isLoaded: true };
          } catch (error) {
            logError("Settings", "Failed to set settings", error);
            return { settings: defaultSettings, isLoaded: true };
          }
        }),

      resetSettings: () =>
        set(() => ({
          settings: defaultSettings,
          isLoaded: true,
        })),

      // Alias for backward compatibility - both call the same set function
      reset: () =>
        set(() => ({
          settings: defaultSettings,
          isLoaded: true,
        })),
    }),
    {
      name: "user-settings",
      version: 1,
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
