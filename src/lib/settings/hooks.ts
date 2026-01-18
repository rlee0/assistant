"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "./store";
import { logError } from "@/lib/logging";
import type { SettingsApiResponse, PasswordChangeResponse, ApiErrorResponse } from "./schema";

/**
 * Constants
 */
const SETTINGS_SAVE_DEBOUNCE_MS = 500;

/**
 * Type guards
 */
function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

function isApiError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Settings Sync Hook
 *
 * Synchronizes local settings store with the server.
 * - Loads settings from server on mount
 * - Persists settings to server when they change
 */

export function useSettingsSync(): void {
  const { settings, setSettings, isLoaded } = useSettingsStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialLoadRef = useRef(false);

  // Load settings from server on mount
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function loadSettings(): Promise<void> {
      try {
        const response = await fetch("/api/settings", {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          if (response.status === 401) {
            return; // User not authenticated, skip sync
          }
          throw new Error(`Failed to load settings: ${response.statusText}`);
        }

        const data = (await response.json()) as SettingsApiResponse;
        setSettings(data.settings);
      } catch (error) {
        if (isAbortError(error)) return;
        logError("Settings", "Failed to load settings from server", error);
      }
    }

    void loadSettings();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [setSettings]);

  // Persist settings to server when they change
  useEffect(() => {
    if (!isLoaded || !initialLoadRef.current) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function saveSettings(): Promise<void> {
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          if (response.status === 401) {
            return; // User not authenticated, skip sync
          }
          throw new Error(`Failed to save settings: ${response.statusText}`);
        }
      } catch (error) {
        if (isAbortError(error)) return;
        logError("Settings", "Failed to save settings to server", error);
      }
    }

    const timeoutId = setTimeout(saveSettings, SETTINGS_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [settings, isLoaded]);
}

/**
 * Account Info Hook
 *
 * Fetches account information from the server.
 */

export interface AccountInfo {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

interface UseAccountInfoReturn {
  accountInfo: AccountInfo | null;
  loading: boolean;
  error: string | null;
}

export function useAccountInfo(): UseAccountInfoReturn {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function loadAccountInfo(): Promise<void> {
      try {
        const response = await fetch("/api/settings", {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load account info: ${response.statusText}`);
        }

        const data = (await response.json()) as SettingsApiResponse;
        setAccountInfo(data.account);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(isApiError(err) ? err.message : "Failed to load account info");
      } finally {
        setLoading(false);
      }
    }

    void loadAccountInfo();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, []);

  return { accountInfo, loading, error };
}

/**
 * Change Password Hook
 *
 * Provides a function to change the user's password.
 */

interface UseChangePasswordReturn {
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useChangePassword(): UseChangePasswordReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(errorData.error || "Failed to change password");
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to change password");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error, success };
}
