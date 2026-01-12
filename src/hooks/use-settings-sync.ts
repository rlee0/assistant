"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings-store";
import type { Settings } from "@/lib/settings";

/** Debounce interval for settings save operations (ms) */
const SETTINGS_SAVE_DEBOUNCE_MS = 500;

/**
 * Fetch user settings from the server
 *
 * @returns Parsed settings or null if fetch fails or user is unauthenticated
 */
async function fetchServerSettings(): Promise<Settings | null> {
  try {
    const response = await fetch("/api/settings", {
      method: "GET",
      credentials: "include",
    });

    // User not authenticated - expected for unauthenticated state
    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Settings fetch failed: ${response.statusText}`);
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
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`[Settings] Failed to load from server: ${message}`);
    return null;
  }
}

/**
 * Persist user settings to the server
 *
 * @param settings - The settings object to persist
 * @returns true if persistence was successful, false otherwise
 */
async function persistServerSettings(settings: Settings): Promise<boolean> {
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Settings persist failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
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
 * - Handles authentication state gracefully
 * - Returns hydration status for UI coordination
 *
 * @returns Object containing hydration state
 */
export function useSettingsSync(): { hydrated: boolean } {
  const settings = useSettingsStore((state) => state.settings);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);

  // Effect 1: Load settings from server on component mount
  useEffect(() => {
    const controller = new AbortController();

    fetchServerSettings().then((serverSettings) => {
      // Abort if component unmounted or fetch was cancelled
      if (controller.signal.aborted) return;

      // Skip hydration if no server settings (e.g., unauthenticated user)
      if (!serverSettings) return;

      hydrate(serverSettings);
    });

    return () => {
      controller.abort();
    };
  }, [hydrate]);

  // Effect 2: Persist settings to server when they change (with debouncing)
  useEffect(() => {
    // Only persist after hydration completes
    if (!hydrated) return;

    const timeoutId = setTimeout(() => {
      persistServerSettings(settings).catch(() => {
        // Errors already logged in persistServerSettings
      });
    }, SETTINGS_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [settings, hydrated]);

  return { hydrated };
}
