"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Check,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ERROR_MESSAGES,
  PASSWORD_CONFIG,
  SUCCESS_MESSAGES,
  TEMPERATURE_CONFIG,
  THEME_OPTIONS,
} from "./constants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatProviderName, getModelProvider } from "@/lib/models";
import { useAccountInfo, useChangePassword, useSettingsSync } from "@/lib/settings/hooks";
import { useDeleteAccount, useLogout, usePasswordForm, useThemeChange } from "./hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useGroupedModels } from "@/features/chat/hooks/use-chat-hooks";
import { useModelManagement } from "@/features/chat/hooks/use-chat-hooks";
import { useSettingsStore } from "@/lib/settings/store";
import { useState } from "react";

export default function SettingsPage() {
  // Initialize settings sync
  useSettingsSync();

  const { settings, updateSettings } = useSettingsStore();
  const { accountInfo, loading: accountLoading } = useAccountInfo();

  // Model selector states
  const [chatModelSelectorOpen, setChatModelSelectorOpen] = useState(false);
  const [suggestionsModelSelectorOpen, setSuggestionsModelSelectorOpen] = useState(false);

  // Fetch models
  const { models, modelsLoading } = useModelManagement(settings.chat.model, (modelId) =>
    updateSettings({ chat: { ...settings.chat, model: modelId } })
  );

  const groupedModels = useGroupedModels(models);
  const {
    changePassword,
    loading: passwordLoading,
    error: passwordError,
    success: passwordSuccess,
  } = useChangePassword();

  // Custom hooks for settings operations
  const { logout, isLoggingOut } = useLogout();
  const { deleteAccount, isDeleting } = useDeleteAccount();
  const { handleThemeChange } = useThemeChange(updateSettings);

  // Password form state
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    resetForm: resetPasswordForm,
  } = usePasswordForm();

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const success = await changePassword(currentPassword, newPassword, confirmPassword);

    if (success) {
      toast.success(SUCCESS_MESSAGES.PASSWORD_UPDATED);
      resetPasswordForm();
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
          <p className="text-muted-foreground">
            Customize your experience and manage your account.
          </p>
        </div>

        <Separator />

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the application looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="theme" className="text-base">
                Theme
              </Label>
              <Select value={settings.appearance.theme} onValueChange={handleThemeChange}>
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      <div className="flex items-center gap-2">
                        {theme === "light" && <Sun className="h-4 w-4" />}
                        {theme === "dark" && <Moon className="h-4 w-4" />}
                        {theme === "system" && <Monitor className="h-4 w-4" />}
                        <span className="capitalize">{theme}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Chat Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Chat Preferences</CardTitle>
            </div>
            <CardDescription>Configure your default chat model and behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="chat-model" className="text-base">
                Default Model
              </Label>
              <Button
                variant="outline"
                onClick={() => setChatModelSelectorOpen(true)}
                className="w-full justify-start"
                disabled={modelsLoading}>
                {modelsLoading ? (
                  "Loading models..."
                ) : (
                  <span className="truncate">
                    {models.find((m) => m.id === settings.chat.model)?.name || settings.chat.model}
                  </span>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature" className="text-base">
                  Temperature
                </Label>
                <span className="text-sm font-medium tabular-nums">
                  {settings.chat.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                id="temperature"
                min={TEMPERATURE_CONFIG.MIN}
                max={TEMPERATURE_CONFIG.MAX}
                step={TEMPERATURE_CONFIG.STEP}
                value={[settings.chat.temperature]}
                onValueChange={([value]) =>
                  updateSettings({
                    chat: { ...settings.chat, temperature: value },
                  })
                }
                className="py-4"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Controls randomness: 0 is focused and deterministic, 2 is creative and random.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Suggestions</CardTitle>
            </div>
            <CardDescription>Control automatic follow-up suggestions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="suggestions-enabled" className="text-base cursor-pointer">
                  Enable Suggestions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show AI-generated follow-up questions after each response
                </p>
              </div>
              <Switch
                id="suggestions-enabled"
                checked={settings.suggestions.enabled}
                onCheckedChange={(checked) =>
                  updateSettings({
                    suggestions: { ...settings.suggestions, enabled: checked },
                  })
                }
              />
            </div>

            {settings.suggestions.enabled && (
              <div className="space-y-3 pt-2">
                <Label htmlFor="suggestions-model" className="text-base">
                  Suggestions Model
                </Label>
                <Button
                  variant="outline"
                  onClick={() => setSuggestionsModelSelectorOpen(true)}
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

        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>View your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : accountInfo ? (
              <>
                <div className="grid gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{accountInfo.email}</p>
                  </div>

                  {accountInfo.displayName && (
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Display Name</Label>
                      <p className="text-sm font-medium">{accountInfo.displayName}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Member Since</Label>
                    <p className="text-sm font-medium">
                      {new Date(accountInfo.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <Button
                  onClick={() => void logout()}
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? "Signing Out..." : "Sign Out"}
                </Button>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ERROR_MESSAGES.ACCOUNT_INFO_LOAD_FAILED}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Enter new password (min. ${PASSWORD_CONFIG.MIN_LENGTH} characters)`}
                  required
                  minLength={PASSWORD_CONFIG.MIN_LENGTH}
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={passwordLoading}
                />
              </div>

              {passwordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              {passwordSuccess && (
                <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
                  <Check className="h-4 w-4" />
                  <AlertDescription>Password updated successfully!</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>Permanent and irreversible actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deleting your account will permanently remove all your data, including chats,
                messages, and settings. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting} className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting Account..." : "Delete Account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This action <strong>cannot be undone</strong>. This will permanently delete
                      your account and remove all your data from our servers.
                    </p>
                    <p className="text-sm">All of the following will be deleted:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>All chat conversations</li>
                      <li>All messages and checkpoints</li>
                      <li>Your settings and preferences</li>
                      <li>Your account credentials</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void deleteAccount()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Chat Model Selector Dialog */}
        <ModelSelector open={chatModelSelectorOpen} onOpenChange={setChatModelSelectorOpen}>
          <ModelSelectorContent title="Select Chat Model">
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList>
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <ModelSelectorGroup key={provider} heading={formatProviderName(provider)}>
                  {providerModels.map((model) => {
                    const isSelected = model.id === settings.chat.model;
                    const hasReasoning = model.tags?.includes("reasoning") ?? false;
                    return (
                      <ModelSelectorItem
                        key={model.id}
                        onSelect={() => {
                          updateSettings({ chat: { ...settings.chat, model: model.id } });
                          setChatModelSelectorOpen(false);
                        }}>
                        <ModelSelectorLogoGroup>
                          <ModelSelectorLogo provider={getModelProvider(model)} />
                        </ModelSelectorLogoGroup>
                        <div className="flex flex-1 items-baseline gap-2 overflow-hidden">
                          <ModelSelectorName className="flex-none">{model.name}</ModelSelectorName>
                          <span className="truncate text-xs text-muted-foreground">
                            ({model.id})
                          </span>
                          {hasReasoning && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              reasoning
                            </Badge>
                          )}
                        </div>
                        {isSelected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                      </ModelSelectorItem>
                    );
                  })}
                </ModelSelectorGroup>
              ))}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {/* Suggestions Model Selector Dialog */}
        {settings.suggestions.enabled && (
          <ModelSelector
            open={suggestionsModelSelectorOpen}
            onOpenChange={setSuggestionsModelSelectorOpen}>
            <ModelSelectorContent title="Select Suggestions Model">
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <ModelSelectorGroup key={provider} heading={formatProviderName(provider)}>
                    {providerModels.map((model) => {
                      const isSelected = model.id === settings.suggestions.model;
                      const hasReasoning = model.tags?.includes("reasoning") ?? false;
                      return (
                        <ModelSelectorItem
                          key={model.id}
                          onSelect={() => {
                            updateSettings({
                              suggestions: { ...settings.suggestions, model: model.id },
                            });
                            setSuggestionsModelSelectorOpen(false);
                          }}>
                          <ModelSelectorLogoGroup>
                            <ModelSelectorLogo provider={getModelProvider(model)} />
                          </ModelSelectorLogoGroup>
                          <div className="flex flex-1 items-baseline gap-2 overflow-hidden">
                            <ModelSelectorName className="flex-none">
                              {model.name}
                            </ModelSelectorName>
                            <span className="truncate text-xs text-muted-foreground">
                              ({model.id})
                            </span>
                            {hasReasoning && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                reasoning
                              </Badge>
                            )}
                          </div>
                          {isSelected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        )}
      </div>
    </div>
  );
}
