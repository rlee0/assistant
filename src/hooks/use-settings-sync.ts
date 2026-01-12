"use client";

import { useEffect, useRef } from "react";

import type { Settings } from "@/lib/settings";
import { useSettingsStore } from "@/store/settings-store";

/** Debounce interval for settings save operations (ms) */
const SETTINGS_SAVE_DEBOUNCE_MS = 500;

/** Request timeout for settings operations (ms) */
const SETTINGS_REQUEST_TIMEOUT_MS = 10000;

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

    // Don't log timeout errors (these are expected during unmount)
    if (message.includes("abort")) {
      return null;
    }

    console.error(`[Settings] Failed to load from server: ${message}`);
    return null;
  }
}

/**
 * Persist user settings to the server with timeout and abort support
 *
 * @param settings - The settings object to persist
 * @param signal Optional AbortSignal for request cancellation
 * @returns true if persistence was successful, false otherwise
 */
async function persistServerSettings(
  settings: Settings | null,
  signal?: AbortSignal
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
        throw new Error(`Settings persist failed: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    // Don't log timeout errors (these are expected during unmount)
    if (message.includes("abort")) {
      return false;
    }

    console.error(`[Settings] Failed to persist to server: ${message}`);
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
        persistServerSettings(settings).catch(() => {
          // Errors already logged in persistServerSettings
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
