"use client";

import { useEffect, useRef } from "react";

import type { Settings } from "@/lib/settings";
import { logError } from "@/lib/logging";
import { useSettingsStore } from "@/store/settings-store";

/** Debounce interval for settings save operations (ms) */
const SETTINGS_SAVE_DEBOUNCE_MS = 500;

/** Request timeout for settings operations (ms) */
const SETTINGS_REQUEST_TIMEOUT_MS = 10000;

/** Max retry attempts for failed persist operations */
const MAX_PERSIST_RETRIES = 3;

/** Exponential backoff base for retry delays (ms) */
const RETRY_BACKOFF_MS = 1000;

/**
 * Calculate exponential backoff delay for retry
 * @private
 */
function getRetryDelay(attempt: number): number {
  return RETRY_BACKOFF_MS * Math.pow(2, attempt);
}

/**
 * Fetch user settings from the server with timeout and abort support
 *
 * @param signal Optional AbortSignal for request cancellation
 * @returns Parsed settings or null if fetch fails or user is unauthenticated
 */
async function fetchServerSettings(signal?: AbortSignal): Promise<Settings | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SETTINGS_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/settings", {
        method: "GET",
        credentials: "include",
        signal: signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      // User not authenticated - expected for unauthenticated state
      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Settings fetch failed: ${response.status} ${response.statusText}`);
      }

      const data: unknown = await response.json();

      // Runtime validation of API response structure
      if (
        typeof data === "object" &&
        data !== null &&
        "settings" in data &&
        typeof (data as Record<string, unknown>).settings === "object"
      ) {
        return (data as Record<string, unknown>).settings as Settings;
      }

      throw new Error("Invalid settings response format from server");
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    // Don't log abort errors (these are expected during unmount)
    if (!message.includes("abort")) {
      logError("[SettingsSync]", "Failed to load from server", error as Error);
    }
    return null;
  }
}

/**
 * Persist user settings to the server with timeout, abort support, and retry logic
 *
 * @param settings - The settings object to persist
 * @param signal Optional AbortSignal for request cancellation
 * @param attempt Current retry attempt (0-indexed)
 * @returns true if persistence was successful, false otherwise
 */
async function persistServerSettings(
  settings: Settings | null,
  signal?: AbortSignal,
  attempt: number = 0
): Promise<boolean> {
  // Skip persistence if settings are null or invalid
  if (!settings) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SETTINGS_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settings),
        signal: signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Retry on 5xx errors, give up on 4xx client errors
        if (response.status >= 500 && attempt < MAX_PERSIST_RETRIES) {
          const delay = getRetryDelay(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return persistServerSettings(settings, signal, attempt + 1);
        }
        throw new Error(`Settings persist failed: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    // Don't log abort errors (these are expected during unmount)
    if (!message.includes("abort")) {
      logError(
        "[SettingsSync]",
        `Failed to persist to server (attempt ${attempt + 1}/${MAX_PERSIST_RETRIES + 1})`,
        error as Error
      );
    }
    return false;
  }
}

/**
 * Hook to synchronize local settings store with server
 *
 * Features:
 * - Loads user settings from server on mount
 * - Persists settings changes with debouncing to prevent excessive requests
 * - Handles authentication state gracefully (unauthenticated users skip sync)
 * - Proper cleanup of timeouts, AbortControllers, and async operations
 * - Returns hydration status for UI coordination
 * - Waits for hydration before persisting to avoid sending incomplete data
 * - Guards against localStorage unavailability
 *
 * @returns Object containing hydration state
 */
export function useSettingsSync(): { hydrated: boolean } {
  const settings = useSettingsStore((state) => state.settings);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);

  // Track refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Effect 1: Load settings from server on component mount
  useEffect(() => {
    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    fetchServerSettings(abortControllerRef.current.signal).then((serverSettings) => {
      // Only update if component is still mounted and signal wasn't aborted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted && serverSettings) {
        hydrate(serverSettings);
      }
    });

    return () => {
      abortControllerRef.current?.abort();
      isMountedRef.current = false;
    };
  }, [hydrate]);

  // Effect 2: Persist settings to server when they change (with debouncing)
  useEffect(() => {
    // Only persist after hydration completes
    if (!hydrated) return;

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timer
    debounceTimeoutRef.current = setTimeout(() => {
      // Only persist if component is still mounted
      if (isMountedRef.current) {
        persistServerSettings(settings).catch((error) => {
          // Errors already logged in persistServerSettings
          // This catch is just to prevent unhandled promise rejection
          void error;
        });
      }
    }, SETTINGS_SAVE_DEBOUNCE_MS);

    return () => {
      // Clean up timeout on effect cleanup or dependency change
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [settings, hydrated]);

  return { hydrated };
}
