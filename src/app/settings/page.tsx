"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toolDefinitions, defaultToolSettings } from "@/tools";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

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

function buildDefaultSettings(): Settings {
  return settingsSchema.parse({
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
    tools: defaultToolSettings(),
  });
}

export default function SettingsPage() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [settings, setSettings] = useState<Settings>(buildDefaultSettings());
  const [jsonMode, setJsonMode] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from("settings")
        .select("data")
        .eq("id", userId ?? "me")
        .maybeSingle();
      if (data?.data) {
        setSettings(settingsSchema.parse(data.data));
      }
    }
    void load();
  }, [supabase, userId]);

  const saveSettings = useCallback(async () => {
    try {
      const parsed = settingsSchema.parse(settings);
      if (supabase) {
        await supabase.from("settings").upsert({
          id: userId ?? "me",
          data: parsed,
          updated_at: new Date().toISOString(),
        });
        const toolRows = Object.entries(parsed.tools ?? {}).map(
          ([id, config]) => ({
            id,
            user_id: userId ?? "me",
            settings: config,
          })
        );
        if (toolRows.length) {
          await supabase.from("tools").upsert(toolRows);
        }
      }
      setStatus("Settings saved");
    } catch (error) {
      console.error(error);
      setStatus("Failed to save");
    }
  }, [settings, supabase, userId]);

  const updateAccount = useCallback(async () => {
    if (!supabase) return;
    const parsed = settingsSchema.shape.account.parse(settings.account);
    const { error } = await supabase.auth.updateUser({
      email: parsed.email,
      password: parsed.password || undefined,
      data: { displayName: parsed.displayName },
    });
    setStatus(error ? error.message : "Account updated");
  }, [settings.account, supabase]);

  const deleteAccount = useCallback(async () => {
    try {
      await fetch("/api/account/delete", { method: "POST" });
      if (supabase) await supabase.auth.signOut();
      window.location.href = "/signup";
    } catch (error) {
      console.error(error);
      setStatus("Unable to delete account");
    }
  }, [supabase]);

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
        {status ? <p className="mt-2 text-xs text-zinc-500">{status}</p> : null}
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
                    setSettings(settingsSchema.parse(parsed));
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
                    onChange={(e) => update(["account", "email"], e.target.value)}
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => updateAccount()}>
                  Update account
                </Button>
                <Button variant="destructive" onClick={() => deleteAccount()}>
                  Delete account
                </Button>
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
                {toolDefinitions.map((toolDef) => {
                  const toolSettings =
                    (settings.tools?.[toolDef.id] as Record<string, unknown>) ??
                    toolDef.settingsSchema.parse({});
                  return (
                    <Card key={toolDef.id}>
                      <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{toolDef.name}</p>
                            <p className="text-xs text-zinc-500">
                              {toolDef.description}
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input
                              type="checkbox"
                              checked={(toolSettings as { enabled?: boolean }).enabled ?? true}
                              onChange={(e) =>
                                update(
                                  ["tools", toolDef.id, "enabled"],
                                  e.target.checked
                                )
                              }
                            />
                            Enabled
                          </label>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        {Object.entries(toolDef.settingsSchema.shape).map(
                          ([key, schema]) => (
                            <Field key={key} label={key}>
                              {renderSettingControl({
                                value: toolSettings[key],
                                onChange: (val) =>
                                  update(["tools", toolDef.id, key], val),
                                schema,
                              })}
                            </Field>
                          )
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function renderSettingControl({
  value,
  onChange,
  schema,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  schema: z.ZodTypeAny;
}) {
  if (schema instanceof z.ZodBoolean) {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  if (schema instanceof z.ZodNumber) {
    return (
      <Input
        type="number"
        value={Number(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (schema instanceof z.ZodEnum) {
    return (
      <select
        className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
        value={String(value ?? schema.options[0])}
        onChange={(e) => onChange(e.target.value)}
      >
        {schema.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
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
      <span className="capitalize">{label}</span>
      {children}
    </label>
  );
}
