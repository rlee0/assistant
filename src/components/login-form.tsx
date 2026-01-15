"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type FormState = {
  email: string;
  password: string;
  error: string | null;
  isLoading: boolean;
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [state, setState] = useState<FormState>({
    email: "",
    password: "",
    error: null,
    isLoading: false,
  });

  const handleLogin = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      setState((prev) => ({ ...prev, error: null, isLoading: true }));

      try {
        const supabase = createSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: state.email,
          password: state.password,
        });

        if (signInError) {
          setState((prev) => ({ ...prev, error: signInError.message, isLoading: false }));
          return;
        }

        window.location.href = "/";
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        setState((prev) => ({ ...prev, error: message, isLoading: false }));
      }
    },
    [state.email, state.password]
  );

  const handleOAuth = useCallback(async (provider: "google" | "github") => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });

      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth authentication failed";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

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
                value={state.email}
                onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
                disabled={state.isLoading}
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
                value={state.password}
                onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))}
                disabled={state.isLoading}
              />
            </Field>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={state.isLoading} className="w-full">
              {state.isLoading ? "Logging in..." : "Login"}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={state.isLoading}
              className="w-full"
              onClick={() => handleOAuth("google")}>
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
