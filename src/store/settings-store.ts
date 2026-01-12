import { create } from "zustand";
import { persist } from "zustand/middleware";
import { settingsSchema, buildDefaultSettings, type Settings } from "@/lib/settings";
import { ZodError } from "zod";

/**
 * Path-based getter/setter with type safety
 */
type SettingPath = Array<string | number>;

type SettingsState = {
  settings: Settings;
  hydrated: boolean;
  hydrate: (data: unknown) => void;
  update: (path: SettingPath, value: unknown) => void;
  updateBatch: (updates: Partial<Settings>) => void;
  reset: () => void;
  get: <T = unknown>(path: SettingPath) => T | undefined;
  tryGet: <T = unknown>(path: SettingPath) => T | null;
};

/**
 * Schema-driven settings store
 *
 * This store is completely configuration-driven - it doesn't hardcode any
 * specific settings fields. All structure comes from the settingsSchema.
 *
 * Features:
 * - Validates all updates against schema
 * - Provides safe path-based access with type inference
 * - Handles errors gracefully during hydration
 * - Persists to localStorage with recovery on corruption
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: buildDefaultSettings(),
      hydrated: false,

      hydrate: (data: unknown) => {
        try {
          const validated = settingsSchema.parse(data);
          set(() => ({
            settings: validated,
            hydrated: true,
          }));
        } catch (error) {
          // Validation failed - log error but don't crash
          if (error instanceof ZodError) {
            console.error("[Settings] Hydration validation failed. Using defaults.", error.issues);
          } else {
            console.error("[Settings] Hydration error:", error);
          }
          // Reset to defaults on validation failure
          set(() => ({
            settings: buildDefaultSettings(),
            hydrated: true,
          }));
        }
      },

      update: (path, value) =>
        set((state) => {
          try {
            type Mutable = Record<string | number, unknown>;
            const clone = structuredClone(state.settings) as Mutable;

            // Navigate to parent and set value
            let current: Mutable = clone;
            for (let i = 0; i < path.length - 1; i += 1) {
              const key = path[i];
              if (!(key in current)) {
                console.warn(`[Settings] Path component not found: ${String(key)}`);
                return state; // Return unchanged state
              }
              current = current[key] as Mutable;
            }

            if (path.length > 0) {
              current[path[path.length - 1]] = value;
            }

            // Validate entire settings object before persisting
            const validated = settingsSchema.parse(clone);
            return { settings: validated };
          } catch (error) {
            if (error instanceof ZodError) {
              console.error("[Settings] Update validation failed:", error.issues);
            } else {
              console.error("[Settings] Update error:", error);
            }
            return state; // Return unchanged on validation error
          }
        }),

      updateBatch: (updates) =>
        set((state) => {
          try {
            const merged = { ...state.settings, ...updates };
            const validated = settingsSchema.parse(merged);
            return { settings: validated };
          } catch (error) {
            if (error instanceof ZodError) {
              console.error("[Settings] Batch update validation failed:", error.issues);
            } else {
              console.error("[Settings] Batch update error:", error);
            }
            return state; // Return unchanged on validation error
          }
        }),

      reset: () =>
        set(() => ({
          settings: buildDefaultSettings(),
        })),

      get: <T = unknown>(path: SettingPath): T | undefined => {
        const settings = get().settings;
        let current: unknown = settings;

        for (const key of path) {
          if (!current || typeof current !== "object") {
            return undefined;
          }
          current = (current as Record<string | number, unknown>)[key];
        }

        return current as T;
      },

      tryGet: <T = unknown>(path: SettingPath): T | null => {
        try {
          const result = get().get<T>(path);
          return result ?? null;
        } catch {
          return null;
        }
      },
    }),
    {
      name: "assistant-settings",
      // Only persist settings when they're fully hydrated
      partialize: (state) => ({
        // Return empty object if not hydrated to prevent persisting incomplete data
        ...(state.hydrated && { settings: state.settings }),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
        }
      },
    }
  )
);
