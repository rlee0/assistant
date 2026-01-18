"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "@/components/ai/model-selector";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

import { API_ROUTES } from "@/lib/api/routes";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import {
  fetchModels,
  formatProviderName,
  getModelProvider,
  groupModelsByProvider,
  type Model,
} from "@/lib/models";
import { LAYOUT, OVERFLOW, SIZE, SPACING, TEXT } from "@/styles/constants";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Settings
  const settings = useSettingsStore((state) => state.settings);
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const updateSettings = useSettingsStore((state) => state.update);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

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

  // Load available models
  useEffect(() => {
    async function loadModels() {
      try {
        const fetchedModels = await fetchModels();
        setModels(fetchedModels);
      } catch (error) {
        logError("[Settings]", "Failed to load models", error);
      } finally {
        setModelsLoading(false);
      }
    }
    loadModels();
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

        {/* Suggestions Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
            <CardDescription>
              Configure automatic suggestions that appear after each response
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Suggestions */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="suggestions-enabled">Enable Suggestions</Label>
                <p className="text-sm text-zinc-600">
                  Show contextual suggestions for next prompts after each response
                </p>
              </div>
              <Switch
                id="suggestions-enabled"
                checked={settings.suggestions?.enabled ?? false}
                onCheckedChange={(checked) => {
                  updateSettings(["suggestions", "enabled"], checked);
                }}
                disabled={!settingsHydrated}
              />
            </div>

            {/* Model Selection for Suggestions */}
            {settingsHydrated && (settings.suggestions?.enabled ?? false) && (
              <div className="space-y-2">
                <Label htmlFor="suggestions-model">Suggestions Model</Label>
                <p className="text-sm text-zinc-600">
                  Choose which model to use for generating suggestions
                </p>
                <Button
                  variant="outline"
                  onClick={() => setModelSelectorOpen(true)}
                  className="w-full justify-start"
                  disabled={modelsLoading}>
                  {modelsLoading ? (
                    "Loading models..."
                  ) : (
                    <span className="truncate">
                      {models.find((m) => m.id === settings.suggestions.model)?.name ||
                        settings.suggestions.model}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Selector Modal */}
        {settingsHydrated && (settings.suggestions?.enabled ?? false) && (
          <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {Object.entries(groupModelsByProvider(models)).map(([provider, providerModels]) => (
                  <ModelSelectorGroup key={provider} heading={formatProviderName(provider)}>
                    {providerModels.map((model) => {
                      const isSelected = model.id === (settings.suggestions?.model ?? "");
                      const hasReasoning = model.tags?.includes("reasoning") ?? false;
                      return (
                        <ModelSelectorItem
                          key={model.id}
                          onSelect={() => {
                            updateSettings(["suggestions", "model"], model.id);
                            setModelSelectorOpen(false);
                          }}>
                          <ModelSelectorLogoGroup>
                            <ModelSelectorLogo provider={getModelProvider(model)} />
                          </ModelSelectorLogoGroup>
                          <div
                            className={`${LAYOUT.flexRow} flex-1 items-baseline ${SPACING.gap2} ${OVERFLOW.hidden}`}>
                            <ModelSelectorName className="flex-none">
                              {model.name}
                            </ModelSelectorName>
                            <span className="truncate text-xs text-muted-foreground">
                              ({model.id})
                            </span>
                            {hasReasoning && (
                              <Badge variant="secondary" className={`${TEXT.xs} ${TEXT.normal}`}>
                                reasoning
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Check className={`ml-auto ${SIZE.size4} shrink-0 ${TEXT.primary}`} />
                          )}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        )}

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
