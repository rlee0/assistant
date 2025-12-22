"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tools } from "@/tools";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCallback } from "react";

const settingsSchema = z.object({
  account: z.object({
    email: z.string().email(),
    displayName: z.string().min(2),
    password: z.string().min(6).optional(),
  }),
  appearance: z.object({
    theme: z.enum(["light", "dark", "system"]),
    density: z.enum(["comfortable", "compact"]),
  }),
  models: z.object({
    defaultModel: z.string(),
    temperature: z.number().min(0).max(1),
    apiKey: z.string().optional(),
  }),
  tools: z.record(z.any()),
});

type Settings = z.infer<typeof settingsSchema>;

const defaultSettings: Settings = {
  account: {
    email: "user@example.com",
    displayName: "Assistant User",
    password: "",
  },
  appearance: {
    theme: "system",
    density: "comfortable",
  },
  models: {
    defaultModel: "gpt-4o-mini",
    temperature: 0.4,
    apiKey: "",
  },
  tools: Object.fromEntries(
    tools.map((tool) => [
      tool.id,
      tool.settingsSchema.parse({}),
    ])
  ),
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [jsonMode, setJsonMode] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      const parsed = settingsSchema.parse(settings);
      if (supabase) {
        await supabase.from("settings").upsert({
          id: "me",
          data: parsed,
          updated_at: new Date().toISOString(),
        });
      }
      setStatus("Settings saved");
    } catch (error) {
      console.error(error);
      setStatus("Failed to save");
    }
  }, [settings, supabase]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveSettings();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveSettings]);

  function update(path: Array<string | number>, value: unknown) {
    type Mutable = Record<string | number, unknown>;
    setSettings((prev) => {
      const clone = structuredClone(prev) as Mutable;
      let current: Mutable = clone;
      for (let i = 0; i < path.length - 1; i += 1) {
        current = current[path[i]] as Mutable;
      }
      current[path[path.length - 1]] = value;
      return clone as Settings;
    });
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-zinc-50">
      <aside className="border-r border-zinc-200 bg-white p-4">
        <div className="mb-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Back to chats
          </Link>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <a href="#account" className="rounded px-2 py-1 hover:bg-zinc-100">
            Account
          </a>
          <a href="#appearance" className="rounded px-2 py-1 hover:bg-zinc-100">
            Appearance
          </a>
          <a href="#models" className="rounded px-2 py-1 hover:bg-zinc-100">
            Models
          </a>
          <a href="#tools" className="rounded px-2 py-1 hover:bg-zinc-100">
            Tools
          </a>
        </nav>
        <div className="mt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={jsonMode}
              onChange={(e) => setJsonMode(e.target.checked)}
            />
            JSON editor mode (Cmd/Ctrl + S to save)
          </label>
        </div>
        <Button className="mt-4 w-full" onClick={() => saveSettings()}>
          Save settings
        </Button>
        {status ? (
          <p className="mt-2 text-xs text-zinc-500">{status}</p>
        ) : null}
      </aside>
      <main className="flex flex-col gap-4 p-6">
        {jsonMode ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">JSON editor</h2>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[400px] font-mono text-xs"
                value={JSON.stringify(settings, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setSettings(parsed);
                    setStatus(null);
                  } catch {
                    setStatus("Invalid JSON");
                  }
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Section id="account" title="Account">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <Input
                    value={settings.account.email}
                    onChange={(e) =>
                      update(["account", "email"], e.target.value)
                    }
                  />
                </Field>
                <Field label="Display name">
                  <Input
                    value={settings.account.displayName}
                    onChange={(e) =>
                      update(["account", "displayName"], e.target.value)
                    }
                  />
                </Field>
                <Field label="Change password">
                  <Input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={settings.account.password ?? ""}
                    onChange={(e) =>
                      update(["account", "password"], e.target.value)
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section id="appearance" title="Appearance">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Theme">
                  <select
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                    value={settings.appearance.theme}
                    onChange={(e) =>
                      update(["appearance", "theme"], e.target.value)
                    }
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </Field>
                <Field label="Density">
                  <select
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                    value={settings.appearance.density}
                    onChange={(e) =>
                      update(["appearance", "density"], e.target.value)
                    }
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section id="models" title="Models">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Default model">
                  <Input
                    value={settings.models.defaultModel}
                    onChange={(e) =>
                      update(["models", "defaultModel"], e.target.value)
                    }
                  />
                </Field>
                <Field label="Temperature">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.models.temperature}
                    onChange={(e) =>
                      update(["models", "temperature"], Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="AI Gateway API key">
                  <Input
                    type="password"
                    value={settings.models.apiKey ?? ""}
                    onChange={(e) =>
                      update(["models", "apiKey"], e.target.value)
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section id="tools" title="Tools">
              <div className="grid grid-cols-1 gap-4">
                {tools.map((tool) => (
                  <Card key={tool.id}>
                    <CardHeader className="pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{tool.name}</p>
                          <p className="text-xs text-zinc-500">
                            {tool.description}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            checked={settings.tools[tool.id]?.enabled ?? false}
                            onChange={(e) =>
                              update(
                                ["tools", tool.id, "enabled"],
                                e.target.checked
                              )
                            }
                          />
                          Enabled
                        </label>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {Object.keys(tool.settingsSchema.shape).map((key) => (
                        <Field key={key} label={key}>
                          <Input
                            value={settings.tools[tool.id]?.[key] ?? ""}
                            onChange={(e) =>
                              update(
                                ["tools", tool.id, key],
                                e.target.value
                              )
                            }
                          />
                        </Field>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <h2 className="text-lg font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
