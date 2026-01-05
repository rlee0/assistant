import { create } from "zustand";
import { persist } from "zustand/middleware";
import { settingsSchema, buildDefaultSettings, type Settings } from "@/lib/settings";

type SettingsState = {
  settings: Settings;
  hydrated: boolean;
  hydrate: (data: Settings) => void;
  update: (path: Array<string | number>, value: unknown) => void;
  updateBatch: (updates: Partial<Settings>) => void;
  reset: () => void;
  get: <T>(path: Array<string | number>) => T | undefined;
};

/**
 * Schema-driven settings store
 *
 * This store is completely configuration-driven - it doesn't hardcode any
 * specific settings fields. All structure comes from the settingsSchema.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: buildDefaultSettings(),
      hydrated: false,

      hydrate: (data) =>
        set(() => ({
          settings: settingsSchema.parse(data),
          hydrated: true,
        })),

      update: (path, value) =>
        set((state) => {
          type Mutable = Record<string | number, unknown>;
          const clone = structuredClone(state.settings) as Mutable;
          let current: Mutable = clone;
          for (let i = 0; i < path.length - 1; i += 1) {
            current = current[path[i]] as Mutable;
          }
          current[path[path.length - 1]] = value;
          return { settings: settingsSchema.parse(clone) };
        }),

      updateBatch: (updates) =>
        set((state) => ({
          settings: settingsSchema.parse({ ...state.settings, ...updates }),
        })),

      reset: () =>
        set(() => ({
          settings: buildDefaultSettings(),
        })),

      get: <T>(path: Array<string | number>): T | undefined => {
        let current: unknown = get().settings;
        for (const key of path) {
          if (current && typeof current === "object" && key in current) {
            current = (current as Record<string | number, unknown>)[key];
          } else {
            return undefined;
          }
        }
        return current as T;
      },
    }),
    {
      name: "assistant-settings",
      partialize: (state) => ({ settings: state.settings }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
        }
      },
    }
  )
);
