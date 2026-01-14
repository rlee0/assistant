"use client";

/**
 * @deprecated This component is no longer used. Settings are now managed through the /settings page.
 * Navigate to /settings instead of opening this modal.
 * This file is kept for reference only and may be removed in future versions.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";

import { API_ROUTES } from "@/lib/api/routes";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { useLogout } from "@/hooks/use-logout";
import { useRouter } from "next/navigation";

interface SettingsModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Delete State Machine Types
// ============================================================================

type DeleteState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "deleting" }
  | { status: "error"; message: string }
  | { status: "success" };

type DeleteAction =
  | { type: "CONFIRM" }
  | { type: "CANCEL" }
  | { type: "START_DELETE" }
  | { type: "DELETE_SUCCESS" }
  | { type: "DELETE_ERROR"; message: string }
  | { type: "RESET" };

/**
 * Reducer for delete confirmation state machine
 * @private
 */
function deleteStateReducer(state: DeleteState, action: DeleteAction): DeleteState {
  switch (action.type) {
    case "CONFIRM":
      if (state.status === "idle") {
        return { status: "confirming" };
      }
      return state;

    case "CANCEL":
      if (state.status === "confirming" || state.status === "error") {
        return { status: "idle" };
      }
      return state;

    case "START_DELETE":
      if (state.status === "confirming") {
        return { status: "deleting" };
      }
      return state;

    case "DELETE_SUCCESS":
      if (state.status === "deleting") {
        return { status: "success" };
      }
      return state;

    case "DELETE_ERROR":
      if (state.status === "deleting") {
        return { status: "error", message: action.message };
      }
      return state;

    case "RESET":
      return { status: "idle" };

    default:
      return state;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse error message from unknown error type
 * @private
 */
function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Parse API error response
 * @private
 */
async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error || data.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

/**
 * Check if delete state is loading (for rendering purposes)
 * @private
 */
function isDeleteLoading(state: DeleteState): boolean {
  return state.status === "deleting";
}

function SettingsModalContent({ open, onOpenChange }: SettingsModalProps) {
  const router = useRouter();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [deleteState, deleteDispatch] = useReducer(deleteStateReducer, { status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load user email when modal opens
  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Reset and load user state
    async function initializeModalState(): Promise<void> {
      setUserEmail(null);
      setUserLoadError(null);
      deleteDispatch({ type: "RESET" });
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (controller.signal.aborted) {
          return; // Stop if request was cancelled
        }

        if (error) {
          logError("[SettingsModal]", "Auth error", error);
          setUserLoadError("Failed to verify authentication");
          return;
        }

        if (user?.email) {
          setUserEmail(user.email);
        } else {
          logError("[SettingsModal]", "User email not found", new Error("Missing user email"));
          setUserLoadError("User email not available");
        }
      } catch (error) {
        // Ignore errors from aborted requests
        if (controller.signal.aborted) {
          return;
        }
        const message = parseErrorMessage(error);
        logError("[SettingsModal]", "Failed to load user", error as Error);
        setUserLoadError(message);
      }
    }

    initializeModalState();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [open]);

  // Handle account deletion
  const handleDeleteAccount = useCallback(async (): Promise<void> => {
    deleteDispatch({ type: "START_DELETE" });

    try {
      const response = await fetch(API_ROUTES.ACCOUNT.DELETE, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        deleteDispatch({ type: "DELETE_ERROR", message: errorMessage });
        logError("[SettingsModal]", "Account deletion failed", new Error(errorMessage));
        return;
      }

      deleteDispatch({ type: "DELETE_SUCCESS" });
      // Close modal and redirect to login after successful deletion
      onOpenChange(false);
      router.push("/login");
    } catch (error) {
      const message = parseErrorMessage(error);
      deleteDispatch({ type: "DELETE_ERROR", message });
      logError("[SettingsModal]", "Account deletion error", error as Error);
    }
  }, [router, onOpenChange]);

  // Handle logout
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
      onOpenChange(false);
    } catch (error) {
      logError("[SettingsModal]", "Logout failed", error as Error);
      // Still close modal even if logout has an error
      onOpenChange(false);
    }
  }, [logout, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account and preferences</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Account Section */}
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account information and access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Load Error */}
                {userLoadError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{userLoadError}</AlertDescription>
                  </Alert>
                )}

                {/* User Email Display */}
                {userEmail && (
                  <div>
                    <label className="text-sm font-medium text-zinc-700">Email Address</label>
                    <p className="mt-1 text-sm text-zinc-600">{userEmail}</p>
                  </div>
                )}

                {/* Logout Button */}
                <div>
                  <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="outline"
                    className="w-full sm:w-auto">
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-red-800">
                  Irreversible actions that cannot be undone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deleteState.status === "error" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{deleteState.message}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <h3 className="font-medium text-red-900">Delete Account</h3>
                  <p className="mt-1 text-sm text-red-800">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                </div>

                {deleteState.status !== "confirming" ? (
                  <Button
                    onClick={() => deleteDispatch({ type: "CONFIRM" })}
                    variant="destructive"
                    className="w-full sm:w-auto">
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-red-300 bg-white p-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Are you sure?</AlertTitle>
                      <AlertDescription>
                        This will permanently delete your account and all your data. This action
                        cannot be reversed.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={isDeleteLoading(deleteState)}
                        variant="destructive"
                        className="flex-1">
                        {isDeleteLoading(deleteState) ? "Deleting..." : "Yes, Delete My Account"}
                      </Button>
                      <Button
                        onClick={() => deleteDispatch({ type: "CANCEL" })}
                        variant="outline"
                        disabled={isDeleteLoading(deleteState)}
                        className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

SettingsModalContent.displayName = "SettingsModalContent";

/**
 * Settings modal component for managing user account and preferences.
 *
 * @remarks
 * - Fetches user email from Supabase Auth on open
 * - Supports logout and account deletion with confirmation
 * - Properly cleans up async operations on unmount
 * - Memoized to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * return <SettingsModal open={open} onOpenChange={setOpen} />;
 * ```
 */
export const SettingsModal = memo(SettingsModalContent);
