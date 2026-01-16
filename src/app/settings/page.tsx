"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

import { API_ROUTES } from "@/lib/api/routes";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load user email on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to load user information";
        setUserLoadError(msg);
        logError("[Settings]", "Failed to load user", error);
      }
    }
    loadUser();
  }, []);

  // Handle account deletion with memoization
  const handleDeleteAccount = useCallback(async () => {
    setIsLoadingDelete(true);
    setDeleteError(null);

    try {
      const response = await fetch(API_ROUTES.ACCOUNT.DELETE, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete account");
      }

      // Account deleted successfully, redirect to login
      // The API has already signed out the user
      window.location.href = "/login";
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      setDeleteError(message);
      setIsLoadingDelete(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-600">Manage your account and preferences</p>
        </div>

        {/* Account Section */}
        <Card className="mb-6">
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
                onClick={logout}
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
            {deleteError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="font-medium text-red-900">Delete Account</h3>
              <p className="mt-1 text-sm text-red-800">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
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
                    This will permanently delete your account and all your data. This action cannot
                    be reversed.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={isLoadingDelete}
                    variant="destructive"
                    className="flex-1">
                    {isLoadingDelete ? "Deleting..." : "Yes, Delete My Account"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError(null);
                    }}
                    variant="outline"
                    disabled={isLoadingDelete}
                    className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
