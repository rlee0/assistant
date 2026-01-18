"use client";

import { useEffect, useRef } from "react";

import { API_ROUTES } from "@/lib/api/routes";
import type { Settings } from "@/lib/settings";
import { logError } from "@/lib/logging";
import { useSettingsStore } from "@/features/settings/store/settings-store";

// ============================================================================
// Constants & Types
// ============================================================================

/** Request timeout for settings operations (ms) */
const SETTINGS_REQUEST_TIMEOUT_MS = 10000;

/** Error classification for network operations */
type FetchErrorType = "abort" | "network" | "validation" | "auth" | "server" | "unknown";

/**
 * Parse fetch response body safely
 * @throws SyntaxError if JSON is invalid
 */
function parseJsonResponse(body: unknown): unknown {
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}

/**
 * Type guard for API response format
 */
function isValidSettingsResponse(data: unknown): data is { settings: unknown } {
  return (
    typeof data === "object" &&
    data !== null &&
    "settings" in data &&
    typeof (data as Record<string, unknown>).settings === "object"
  );
}

/**
 * Classify fetch errors for appropriate handling
 */
function classifyFetchError(error: unknown): FetchErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("abort")) return "abort";
    if (message.includes("network") || message.includes("fetch")) return "network";
    if (message.includes("json")) return "validation";
    if (message.includes("401")) return "auth";
    if (message.includes("50")) return "server";
  }
  return "unknown";
}

/**
 * Create timeout abort controller
 * Returns [AbortSignal, cleanup function]
 */
function createTimeoutSignal(timeoutMs: number): [AbortSignal, () => void] {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
    controller.abort();
  };

  return [controller.signal, cleanup];
}

// ============================================================================
// Server API Functions
// ============================================================================

/**
 * Fetch user settings from the server with timeout and abort support
 *
 * @param signal Optional AbortSignal for request cancellation
 * @returns Parsed settings or null if fetch fails or user is unauthenticated
 */
async function fetchServerSettings(signal?: AbortSignal): Promise<Settings | null> {
  let cleanup: (() => void) | null = null;

  try {
    const [timeoutSignal, timeoutCleanup] = createTimeoutSignal(SETTINGS_REQUEST_TIMEOUT_MS);
    cleanup = timeoutCleanup;

    const response = await fetch(API_ROUTES.SETTINGS, {
      method: "GET",
      credentials: "include",
      signal: signal ?? timeoutSignal,
    });

    cleanup();
    cleanup = null;

    // Handle authentication gracefully
    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Settings fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = parseJsonResponse(await response.json());

    if (!isValidSettingsResponse(data)) {
      throw new Error("Invalid settings response format from server");
    }

    return data.settings as Settings;
  } catch (error) {
    const errorType = classifyFetchError(error);

    // Don't log expected abort errors from cleanup
    if (errorType !== "abort") {
      logError(
        "[SettingsSync]",
        "Failed to load from server",
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return null;
  } finally {
    cleanup?.();
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
  // Validate input
  if (!settings) {
    return false;
  }

  let cleanup: (() => void) | null = null;

  try {
    const [timeoutSignal, timeoutCleanup] = createTimeoutSignal(SETTINGS_REQUEST_TIMEOUT_MS);
    cleanup = timeoutCleanup;

    const response = await fetch(API_ROUTES.SETTINGS, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(settings),
      signal: signal ?? timeoutSignal,
    });

    cleanup();
    cleanup = null;

    if (!response.ok) {
      throw new Error(`Settings persist failed: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    const errorType = classifyFetchError(error);

    // Don't log expected abort errors
    if (errorType !== "abort") {
      logError(
        "[SettingsSync]",
        "Failed to persist to server",
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return false;
  } finally {
    cleanup?.();
  }
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * Hook to synchronize local settings store with server
 *
 * Responsibilities:
 * - Load user settings from server on initial mount (once per session)
 * - Persist settings changes to server immediately on local updates
 * - Handle authentication state gracefully (skip sync if unauthenticated)
 * - Manage AbortController cleanup for proper unmounting
 *
 * @returns Object containing hydration state for UI coordination
 */
export function useSettingsSync(): { hydrated: boolean } {
  // Select all needed store state in a single selector to minimize subscriptions
  // Use separate selectors to prevent object recreation on each render
  const settings = useSettingsStore((state) => state.settings);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const serverSyncComplete = useSettingsStore((state) => state.serverSyncComplete);

  // Mutable refs for side effect tracking (not render concerns)
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const hasInitialLoadRef = useRef(!serverSyncComplete);
  const previousSettingsRef = useRef<Settings | null>(null);

  // Effect 1: Load from server exactly once per session
  useEffect(() => {
    // Prevent unnecessary reloads if already synced
    if (!hasInitialLoadRef.current) {
      return;
    }

    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    // Async initialization
    (async () => {
      const serverSettings = await fetchServerSettings(abortControllerRef.current?.signal);

      // Only update if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Hydrate with server settings (or empty object to use defaults)
      hydrate(serverSettings ?? {});

      // Mark initial load complete
      hasInitialLoadRef.current = false;
      previousSettingsRef.current = serverSettings;
    })();

    return () => {
      abortControllerRef.current?.abort();
      isMountedRef.current = false;
    };
  }, [hydrate, serverSyncComplete]);

  // Effect 2: Persist to server when settings change
  useEffect(() => {
    // Skip if not hydrated or still loading initial settings
    if (!hydrated || hasInitialLoadRef.current) {
      return;
    }

    // Avoid persisting unchanged settings (prevents unnecessary network calls)
    if (previousSettingsRef.current === settings) {
      return;
    }

    // Update reference for next comparison
    previousSettingsRef.current = settings;

    // Persist immediately (no debounce) to prevent data loss on logout
    persistServerSettings(settings);
  }, [settings, hydrated]);

  return { hydrated };
}
