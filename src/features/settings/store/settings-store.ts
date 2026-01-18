import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { settingsSchema, buildDefaultSettings, type Settings } from "@/lib/settings";
import { logError } from "@/lib/logging";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Path-based accessor for nested settings properties
 * Enables type-safe deep access: ['models', 'defaultModel']
 */
type SettingPath = ReadonlyArray<string | number>;

/**
 * Zustand store state and actions
 */
type SettingsState = {
  settings: Settings;
  hydrated: boolean;
  serverSyncComplete: boolean;
  hydrate: (data: unknown) => void;
  update: (path: SettingPath, value: unknown) => void;
  updateBatch: (updates: Partial<Settings>) => void;
  reset: () => void;
  get: <T = unknown>(path: SettingPath) => T | undefined;
  tryGet: <T = unknown>(path: SettingPath) => T | null;
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Type guard: Checks if value is a plain object (not array, null, or primitive)
 */
function isPlainObject(value: unknown): value is Record<string | number | symbol, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep merge utility for recursive object merging
 * Only recurses into plain objects; arrays and other values are replaced.
 * @private
 */
function deepMerge(
  target: Record<string | number | symbol, unknown>,
  source: Record<string | number | symbol, unknown>
): Record<string | number | symbol, unknown> {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    const targetValue = result[key];
    if (isPlainObject(value) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validates and parses raw data into Settings type
 * Returns tuple: [validSettings | null, error | null]
 */
function validateSettings(data: unknown): [Settings | null, Error | null] {
  try {
    const settings = settingsSchema.parse(data);
    return [settings, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error("Unknown validation error")];
  }
}

/**
 * Schema-driven settings store with strict validation and error handling
 *
 * Design Principles:
 * - All data must pass schema validation before being stored
 * - Hydration and updates use the same validation pipeline
 * - Errors are logged structured, not silently swallowed
 * - Dynamic path-based access is intentionally constrained to prevent misuse
 *
 * Features:
 * - LocalStorage persistence with automatic corruption recovery
 * - Zustand DevTools integration for state inspection
 * - Atomic updates with rollback on validation failure
 * - Migration-friendly: merges with defaults to handle schema changes
 */
export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: buildDefaultSettings(),
        hydrated: false,
        serverSyncComplete: false,

        /**
         * Hydrate store from external data source (e.g., localStorage, API)
         * Merges with defaults and validates before storing
         */
        hydrate: (data: unknown) => {
          try {
            const defaults = buildDefaultSettings();

            // Merge external data with defaults to handle schema evolution
            const merged = isPlainObject(data)
              ? deepMerge(defaults as Record<string | number | symbol, unknown>, data)
              : defaults;

            const [settings, error] = validateSettings(merged);
            if (settings === null) {
              throw error;
            }

            set(() => ({
              settings,
              hydrated: true,
              serverSyncComplete: true,
            }));
          } catch (error) {
            logError(
              "[SettingsStore]",
              "Hydration validation failed, using defaults",
              error instanceof Error ? error : new Error(String(error))
            );

            // Clear corrupted localStorage to prevent re-corruption
            try {
              localStorage.removeItem("assistant-settings");
            } catch (storageError) {
              logError(
                "[SettingsStore]",
                "Failed to clear corrupted settings from storage",
                storageError instanceof Error ? storageError : new Error(String(storageError))
              );
            }

            set(() => ({
              settings: buildDefaultSettings(),
              hydrated: true,
            }));
          }
        },

        /**
         * Update a nested setting via path and value
         * Validates entire settings object before persisting
         * Returns unchanged state on validation error
         */
        update: (path, value) =>
          set((state) => {
            try {
              const clone = structuredClone(state.settings);
              let current: unknown = clone;

              // Navigate to parent object
              for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];
                if (!isPlainObject(current) || !(String(key) in current)) {
                  logError(
                    "[SettingsStore]",
                    `Invalid path [${path.join("/")}] at depth ${i}`,
                    new Error("Path component not found in settings")
                  );
                  return state;
                }
                current = current[String(key)];
              }

              // Set value at final key
              if (path.length > 0 && isPlainObject(current)) {
                const lastKey = String(path[path.length - 1]);
                current[lastKey] = value;
              }

              const [settings, error] = validateSettings(clone);
              if (settings === null) {
                logError(
                  "[SettingsStore]",
                  `Update validation failed at path [${path.join("/")}]`,
                  error
                );
                return state;
              }

              return { settings };
            } catch (error) {
              logError(
                "[SettingsStore]",
                "Update failed",
                error instanceof Error ? error : new Error(String(error))
              );
              return state;
            }
          }),

        /**
         * Batch update multiple settings at once
         * All updates validated together before persisting
         */
        updateBatch: (updates) =>
          set((state) => {
            try {
              const merged = deepMerge(
                state.settings as Record<string | number | symbol, unknown>,
                updates as Record<string | number | symbol, unknown>
              );

              const [settings, error] = validateSettings(merged);
              if (settings === null) {
                logError("[SettingsStore]", "Batch update validation failed", error);
                return state;
              }

              return { settings };
            } catch (error) {
              logError(
                "[SettingsStore]",
                "Batch update failed",
                error instanceof Error ? error : new Error(String(error))
              );
              return state;
            }
          }),

        /**
         * Reset to default settings and clear all persistent storage
         * Safe to call during logout
         */
        reset: () => {
          try {
            localStorage.removeItem("assistant-settings");
          } catch (error) {
            logError(
              "[SettingsStore]",
              "Failed to clear settings from storage",
              error instanceof Error ? error : new Error(String(error))
            );
          }

          set(() => ({
            settings: buildDefaultSettings(),
            hydrated: false,
            serverSyncComplete: false,
          }));
        },

        /**
         * Retrieve a nested setting by path
         * Returns undefined if path is invalid or value doesn't exist
         * Type parameter allows inference: store.get<string>(['account', 'email'])
         */
        get: <T = unknown>(path: SettingPath): T | undefined => {
          const settings = get().settings;
          let current: unknown = settings;

          for (const key of path) {
            if (!isPlainObject(current)) {
              return undefined;
            }
            current = current[String(key)];
          }

          return current as T;
        },

        /**
         * Safe getter with error suppression
         * Use this only when null is acceptable; prefer get() with optional chaining
         */
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
        partialize: (state) => ({
          // Only persist after hydration to avoid partially initialized data
          ...(state.hydrated && { settings: state.settings }),
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;

          try {
            const defaults = buildDefaultSettings();
            const merged = deepMerge(
              defaults as Record<string | number | symbol, unknown>,
              state.settings as Record<string | number | symbol, unknown>
            );

            const [settings, error] = validateSettings(merged);
            if (settings === null) {
              throw error;
            }

            state.settings = settings;
          } catch (error) {
            logError(
              "[SettingsStore]",
              "Settings rehydration validation failed, using defaults",
              error instanceof Error ? error : new Error(String(error))
            );
            state.settings = buildDefaultSettings();
          }

          state.hydrated = true;
        },
      }
    ),
    { name: "Settings Store" }
  )
);
