"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import { settingsSchema, type Settings } from "@/lib/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";

// Configure Monaco loader to use local files
loader.config({ paths: { vs: '/monaco-editor/min/vs' } });

// Load Monaco editor dynamically to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[600px] border rounded-lg">Loading editor...</div>
});

/** Save status reset delay in milliseconds */
const SAVE_STATUS_RESET_DELAY_MS = 2000;

/**
 * Configuration-based settings editor with Monaco
 * 
 * Features:
 * - Split view: Form UI and Monaco JSON editor
 * - Monaco editor with syntax highlighting
 * - Last writer wins strategy for conflict resolution
 */
export function SettingsEditor() {
  const settings = useSettingsStore((state) => state.settings);
  const updateBatch = useSettingsStore((state) => state.updateBatch);
  const update = useSettingsStore((state) => state.update);
  const { theme } = useTheme();
  
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  // Compute JSON value from settings - always reflect current settings
  const jsonValue = JSON.stringify(settings, null, 2);

  // Handle Monaco editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  // Handle JSON editor changes
  const handleJsonChange = useCallback((value: string | undefined) => {
    if (!value) return;
    
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
        }, SAVE_STATUS_RESET_DELAY_MS);
      } else {
        const firstError = validated.error.errors[0];
        const errorMsg = firstError 
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : "Configuration validation failed";
        setJsonError(errorMsg);
      }
    } catch {
      setJsonError("Invalid JSON syntax");
    }
  }, [updateBatch]);

  // Handle UI form changes
  const handleUiChange = useCallback((path: string[], value: unknown) => {
    update(path, value);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), SAVE_STATUS_RESET_DELAY_MS);
  }, [update]);

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
          <TabsTrigger value="ui">Settings</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        {/* UI Form View */}
        <TabsContent value="ui" className="space-y-8 mt-6">
          <SettingsForm settings={settings} onChange={handleUiChange} />
        </TabsContent>

        {/* JSON Editor View */}
        <TabsContent value="json" className="mt-6">
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="600px"
              defaultLanguage="json"
              value={jsonValue}
              onChange={handleJsonChange}
              onMount={handleEditorDidMount}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                wordWrap: "on",
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Cleaner UI Form for settings without cards
 */
function SettingsForm({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (path: string[], value: unknown) => void;
}) {
  return (
    <div className="space-y-10">
      {/* Account Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Account</h3>
          <p className="text-sm text-muted-foreground">Manage your account information</p>
        </div>
        <div className="space-y-4 pl-0">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.account.email}
              onChange={(e) => onChange(["account", "email"], e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={settings.account.displayName}
              onChange={(e) => onChange(["account", "displayName"], e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Appearance</h3>
          <p className="text-sm text-muted-foreground">Customize how the app looks</p>
        </div>
        <div className="space-y-4 pl-0">
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings.appearance.theme}
              onValueChange={(value) => onChange(["appearance", "theme"], value)}
            >
              <SelectTrigger id="theme" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="density">Density</Label>
            <Select
              value={settings.appearance.density}
              onValueChange={(value) => onChange(["appearance", "density"], value)}
            >
              <SelectTrigger id="density" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Models Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Models</h3>
          <p className="text-sm text-muted-foreground">Configure AI model settings</p>
        </div>
        <div className="space-y-4 pl-0">
          <div className="grid gap-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Input
              id="defaultModel"
              value={settings.models.defaultModel}
              onChange={(e) => onChange(["models", "defaultModel"], e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="temperature">Temperature ({settings.models.temperature})</Label>
            <Input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.models.temperature}
              onChange={(e) => onChange(["models", "temperature"], parseFloat(e.target.value))}
              className="max-w-md cursor-pointer"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key (Optional)</Label>
            <Input
              id="apiKey"
              type="password"
              value={settings.models.apiKey ?? ""}
              onChange={(e) => onChange(["models", "apiKey"], e.target.value)}
              placeholder="Enter your API key"
              className="max-w-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
