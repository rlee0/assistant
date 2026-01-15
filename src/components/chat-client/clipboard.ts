/**
 * Clipboard operations with proper error handling and permission checking
 * Handles both modern Clipboard API and fallback mechanisms
 */

import { logError } from "@/lib/logging";

/**
 * Checks if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.clipboard;
}

/**
 * Copies text to clipboard
 * Uses only modern Clipboard API for better security and reliability
 * Throws if API is unavailable
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!isClipboardAvailable()) {
    throw new Error("Clipboard API not available in this browser");
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown clipboard error";
    logError("[Clipboard]", "Clipboard write failed", error);
    throw new Error(`Failed to copy to clipboard: ${message}`);
  }
}

/**
 * Reads text from clipboard with proper error handling
 * Requires Clipboard API and appropriate permissions
 */
export async function readFromClipboard(): Promise<string> {
  if (!isClipboardAvailable()) {
    throw new Error("Clipboard API not available in this browser");
  }

  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown clipboard error";
    logError("[Clipboard]", "Clipboard read failed", error);
    throw new Error(`Failed to read from clipboard: ${message}`);
  }
}

/**
 * Safely copies text with toast notification
 * Handles all errors internally and returns success status
 */
export async function safeCopyToClipboard(
  text: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  try {
    await copyToClipboard(text);
    onSuccess?.();
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    onError?.(err);
    return false;
  }
}
