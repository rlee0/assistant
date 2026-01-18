"use client";

import { useEffect, useRef } from "react";

/** Request timeout for settings operations (ms) */
import { API_ROUTES } from "@/lib/api/routes";
import type { Settings } from "@/lib/settings";
import { logError } from "@/lib/logging";
import { useSettingsStore } from "@/features/settings/store/settings-store";

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
      const response = await fetch(API_ROUTES.SETTINGS, {
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
      const response = await fetch(API_ROUTES.SETTINGS, {
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

    // Don't log abort errors (these are expected during unmount)
    if (!message.includes("abort")) {
      logError("[SettingsSync]", "Failed to persist to server", error as Error);
    }
    return false;
  }
}

/**
 * Hook to synchronize local settings store with server
 *
 * Features:
 * - Loads user settings from server on mount
 * - Persists settings changes immediately to prevent data loss
 * - Handles authentication state gracefully (unauthenticated users skip sync)
 * - Proper cleanup of AbortControllers and async operations
 * - Returns hydration status for UI coordination
 *
 * @returns Object containing hydration state
 */
export function useSettingsSync(): { hydrated: boolean } {
  const settings = useSettingsStore((state) => state.settings);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const serverSyncComplete = useSettingsStore((state) => state.serverSyncComplete);

  // Track refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const previousSettingsRef = useRef<Settings | null>(null);

  // Effect 1: Load settings from server on component mount (only once per session)
  useEffect(() => {
    // Skip if we've already synced from server (prevents HMR from overwriting changes)
    if (serverSyncComplete) {
      return;
    }

    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    fetchServerSettings(abortControllerRef.current.signal).then((serverSettings) => {
      // Only update if component is still mounted and signal wasn't aborted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        // Server settings override any localStorage settings
        // Call hydrate to merge server settings with defaults and trigger persistence
        // If serverSettings is null (error or unauthenticated), use empty object to trigger hydration with defaults
        hydrate(serverSettings ?? {});
        isInitialLoadRef.current = false;
        // Store initial settings to detect real changes
        previousSettingsRef.current = settings;
      }
    });

    return () => {
      abortControllerRef.current?.abort();
      isMountedRef.current = false;
    };
  }, [hydrate, serverSyncComplete, settings]);

  // Effect 2: Persist settings to server immediately when they change
  useEffect(() => {
    // Skip initial load and only persist after hydration completes
    if (!hydrated || isInitialLoadRef.current) {
      return;
    }

    // Skip if settings haven't actually changed (prevents unnecessary saves during hydration)
    if (
      previousSettingsRef.current &&
      JSON.stringify(previousSettingsRef.current) === JSON.stringify(settings)
    ) {
      return;
    }

    // Update the reference
    previousSettingsRef.current = settings;

    // Persist immediately (no debounce) to prevent data loss on quick logout
    persistServerSettings(settings).catch((error) => {
      logError("[SettingsSync]", "Failed to persist settings", error as Error);
    });
  }, [settings, hydrated]);

  return { hydrated };
}
