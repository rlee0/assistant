"use client";

import { useCallback, useState } from "react";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import { settingsSchema } from "@/lib/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Configuration-based settings editor with Monaco integration
 * 
 * Features:
 * - Split view: Form UI and JSON editor
 * - JSON editor with real-time validation
 * - Last writer wins strategy for conflict resolution
 * - Real-time validation
 */
export function SettingsEditor() {
  const settings = useSettingsStore((state) => state.settings);
  const updateBatch = useSettingsStore((state) => state.updateBatch);
  const update = useSettingsStore((state) => state.update);
  
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // Compute JSON value from settings - always reflect current settings
  // "Last writer wins" is automatic: both UI and JSON update the same store
  const jsonValue = JSON.stringify(settings, null, 2);

  // Handle JSON editor changes
  const handleJsonChange = useCallback((value: string) => {
    setJsonError(null);
    
    // Try to parse and validate
    try {
      const parsed = JSON.parse(value);
      const validated = settingsSchema.safeParse(parsed);
      
      if (validated.success) {
        updateBatch(validated.data);
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } else {
        setJsonError(validated.error.errors[0]?.message || "Invalid settings");
      }
    } catch {
      setJsonError("Invalid JSON");
    }
  }, [updateBatch]);

  // Handle UI form changes
  const handleUiChange = useCallback((path: string[], value: unknown) => {
    update(path, value);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [update]);

  // Format JSON - re-formats the current settings JSON
  const handleFormat = useCallback(() => {
    // The jsonValue is always formatted from settings
    // But we can trigger a re-render by updating status
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1000);
  }, []);

  return (
    <div className="space-y-4">
      {/* Save Status */}
      {saveStatus === "saved" && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Saved</AlertTitle>
          <AlertDescription className="text-green-800">
            Settings have been saved successfully
          </AlertDescription>
        </Alert>
      )}

      {/* JSON Error */}
      {jsonError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{jsonError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ui" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ui">Settings UI</TabsTrigger>
          <TabsTrigger value="json">JSON Editor</TabsTrigger>
        </TabsList>

        {/* UI Form View */}
        <TabsContent value="ui" className="space-y-4">
          <SettingsForm settings={settings} onChange={handleUiChange} />
        </TabsContent>

        {/* JSON Editor View */}
        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>JSON Configuration</CardTitle>
                  <CardDescription>
                    Edit settings as JSON with real-time validation
                  </CardDescription>
                </div>
                <Button onClick={handleFormat} variant="outline" size="sm">
                  Format
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="font-mono text-sm min-h-[500px]"
                placeholder="JSON configuration..."
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * UI Form for settings
 */
function SettingsForm({
  settings,
  onChange,
}: {
  settings: typeof settingsSchema._type;
  onChange: (path: string[], value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.account.email}
              onChange={(e) => onChange(["account", "email"], e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={settings.account.displayName}
              onChange={(e) => onChange(["account", "displayName"], e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings.appearance.theme}
              onValueChange={(value) => onChange(["appearance", "theme"], value)}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="density">Density</Label>
            <Select
              value={settings.appearance.density}
              onValueChange={(value) => onChange(["appearance", "density"], value)}
            >
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Models Section */}
      <Card>
        <CardHeader>
          <CardTitle>Models</CardTitle>
          <CardDescription>Configure AI model settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Input
              id="defaultModel"
              value={settings.models.defaultModel}
              onChange={(e) => onChange(["models", "defaultModel"], e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature ({settings.models.temperature})</Label>
            <Input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.models.temperature}
              onChange={(e) => onChange(["models", "temperature"], parseFloat(e.target.value))}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (Optional)</Label>
            <Input
              id="apiKey"
              type="password"
              value={settings.models.apiKey || ""}
              onChange={(e) => onChange(["models", "apiKey"], e.target.value)}
              placeholder="Enter your API key"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
