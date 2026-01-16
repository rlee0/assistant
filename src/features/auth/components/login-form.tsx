"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { logError, logWarn } from "@/lib/logging";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useManualProgress } from "@/hooks/use-navigation-progress";
import { useRouter } from "next/navigation";

// Local storage keys for remember me functionality
const STORAGE_KEYS = {
  rememberMe: "assistant.remember_me",
  rememberedEmail: "assistant.remembered_email",
} as const;

function getRememberMeFromStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.rememberMe) === "true";
  } catch (error) {
    logWarn("[LoginForm]", "Failed to read remember_me from storage", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function getRememberedEmailFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.rememberedEmail);
  } catch (error) {
    logWarn("[LoginForm]", "Failed to read remembered_email from storage", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function setRememberMeInStorage(enabled: boolean, email: string): void {
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_KEYS.rememberMe, "true");
      localStorage.setItem(STORAGE_KEYS.rememberedEmail, email);
    } else {
      localStorage.removeItem(STORAGE_KEYS.rememberMe);
      localStorage.removeItem(STORAGE_KEYS.rememberedEmail);
    }
  } catch (error) {
    logWarn("[LoginForm]", "Failed to update remember me in storage", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Note: "Remember me" is a per-device preference; we only persist it locally.
// Server-side settings persistence is intentionally not used to avoid RLS timing and
// to keep the preference device-specific.

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      logError("[LoginForm]", "Supabase client creation failed", error);
      return null;
    }
  }, []);
  const router = useRouter();
  const { startProgress, completeProgress } = useManualProgress();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDisabled = isLoading || !supabase;

  // Prefill from localStorage when logged out or returning
  useEffect(() => {
    const remember = getRememberMeFromStorage();
    const emailFromStorage = getRememberedEmailFromStorage();
    if (remember) {
      setRememberMe(true);
      if (emailFromStorage) setEmail(emailFromStorage);
    }
  }, []);

  // Keep localStorage in sync with current state
  useEffect(() => {
    setRememberMeInStorage(rememberMe, email);
  }, [rememberMe, email]);

  // Load user's remember me preference if they're returning
  useEffect(() => {
    async function loadRememberMePreference() {
      if (!supabase) return;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from("settings")
            .select("data")
            .eq("user_id", user.id)
            .single();
          if (settings?.data?.remember_me) {
            setRememberMe(true);
          }
        }
      } catch (error) {
        logError("[LoginForm]", "Failed to load remember me preference", error);
      }
    }
    loadRememberMePreference();
  }, [supabase]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      setError(null);
      setIsLoading(true);
      startProgress();
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          completeProgress();
          return;
        }

        // No server persistence for remember me (per-device only)

        router.replace("/");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        setError(msg);
        logError("[LoginForm]", "Login flow failed", err as Error);
        completeProgress();
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, email, password, router, startProgress, completeProgress]
  );

  const oauth = useCallback(
    async (provider: "google" | "github") => {
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }
      startProgress();
      try {
        await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/` },
        });
      } catch (error) {
        completeProgress();
        setError(error instanceof Error ? error.message : "OAuth failed");
      }
    },
    [supabase, startProgress, completeProgress]
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isDisabled}
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isDisabled}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isDisabled}
              />
              <FieldLabel htmlFor="remember-me" className="font-normal cursor-pointer">
                Remember me
              </FieldLabel>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!supabase && (
              <p className="text-xs text-red-500">
                Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            )}
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Logging in..."
              disabled={!supabase}
              className="w-full">
              Login
            </LoadingButton>
            <Button
              variant="outline"
              type="button"
              disabled={isDisabled}
              className="w-full"
              onClick={() => oauth("google")}>
              Login with Google
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </FieldDescription>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
