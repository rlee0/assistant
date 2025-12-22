'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftIcon } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, isJsonView, toggleJsonView } = useSettingsStore();
  const [jsonValue, setJsonValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings) {
      setJsonValue(JSON.stringify(settings, null, 2));
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = isJsonView ? JSON.parse(jsonValue) : settings;
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      const savedData = await response.json();
      setSettings(savedData);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (isJsonView) {
        handleSave();
      }
    }
  };

  useEffect(() => {
    if (isJsonView) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJsonView, jsonValue]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Left menu */}
      <div className="w-64 border-r bg-muted/10 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/chat')}
          className="mb-4 w-full justify-start"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Chats
        </Button>
        
        <nav className="space-y-1">
          <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            General
          </button>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            Appearance
          </button>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            AI Settings
          </button>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            Tools
          </button>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            Account
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleJsonView}
              >
                {isJsonView ? 'Form View' : 'JSON View'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isJsonView ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Press Cmd/Ctrl+S to save
              </p>
              <textarea
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                className="h-[600px] w-full rounded-md border border-input bg-background p-4 font-mono text-sm"
              />
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              <section>
                <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Theme</label>
                    <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2">
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Font Size</label>
                    <Input
                      type="number"
                      min="12"
                      max="24"
                      defaultValue={settings?.appearance?.fontSize || 14}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold">AI Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      defaultValue={settings?.ai?.temperature || 0.7}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max Tokens</label>
                    <Input
                      type="number"
                      defaultValue={settings?.ai?.maxTokens || 2000}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold">AI Gateway</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">API Key</label>
                    <Input
                      type="password"
                      placeholder="Enter your AI Gateway API key"
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
