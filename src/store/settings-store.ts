import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { settingsSchema, buildDefaultSettings, type Settings } from "@/lib/settings";
import { logError } from "@/lib/logging";

/**
 * Deep merge utility for recursive object merging
 * @private
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    // Only recurse if both values are plain objects (not arrays, null, etc.)
    const targetValue = result[key];
    if (
      value !== undefined &&
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      targetValue !== undefined &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

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
 * - DevTools integration for development debugging (when NODE_ENV=development)
 */
export const useSettingsStore = create<SettingsState>()(
  devtools(
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
            // Validation failed - clear corrupted data and use defaults
            logError(
              "[SettingsStore]",
              "Hydration validation failed, using defaults",
              error as Error
            );

            // Clear corrupted localStorage data to prevent re-corruption on next load
            try {
              localStorage.removeItem("assistant-settings");
            } catch (storageError) {
              // localStorage may be disabled or unavailable - log but don't crash
              logError(
                "[SettingsStore]",
                "Failed to clear corrupted settings from storage",
                storageError as Error
              );
            }

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
                  logError(
                    "[SettingsStore]",
                    `Path component not found: ${String(key)}`,
                    new Error("Invalid path for settings update")
                  );
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
              logError("[SettingsStore]", "Update validation failed", error as Error);
              return state; // Return unchanged on validation error
            }
          }),

        updateBatch: (updates) =>
          set((state) => {
            try {
              const merged = deepMerge(
                state.settings as Record<string, unknown>,
                updates as Record<string, unknown>
              );
              const validated = settingsSchema.parse(merged);
              return { settings: validated };
            } catch (error) {
              logError("[SettingsStore]", "Batch update validation failed", error as Error);
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
    ),
    { name: "Settings Store" }
  )
);
