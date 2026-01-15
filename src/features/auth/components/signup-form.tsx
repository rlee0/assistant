"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LoadingButton } from "@/components/ui/loading-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { useManualProgress } from "@/hooks/use-navigation-progress";
import { useRouter } from "next/navigation";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      logError("[SignupForm]", "Failed to initialize Supabase client", error);
      return null;
    }
  }, []);
  const router = useRouter();
  const { startProgress, completeProgress } = useManualProgress();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDisabled = isLoading || !supabase;

  function validateForm(): string | null {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      return "Full name is required.";
    }

    if (!trimmedEmail) {
      return "Email is required.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!supabase) {
      setError("Authentication service is unavailable.");
      return;
    }

    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    startProgress();

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        completeProgress();
        return;
      }

      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(message);
      completeProgress();
    } finally {
      setIsLoading(false);
    }
  }

  async function oauth(provider: "google" | "github"): Promise<void> {
    if (!supabase) {
      setError("Authentication service is unavailable.");
      return;
    }

    startProgress();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });

      if (error) {
        setError(error.message);
        completeProgress();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth authentication failed";
      setError(message);
      completeProgress();
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your information below to create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isDisabled}
            />
          </Field>
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
            <FieldDescription>
              We&apos;ll use this to contact you. We will not share your email with anyone else.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDisabled}
            />
            <FieldDescription>Must be at least 8 characters long.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isDisabled}
            />
            <FieldDescription>Please confirm your password.</FieldDescription>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!supabase && (
            <p className="text-xs text-red-500">
              Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </p>
          )}
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Creating Account..."
            disabled={!supabase}
            className="w-full">
            Create Account
          </LoadingButton>
          <Button
            variant="outline"
            type="button"
            disabled={isDisabled}
            className="w-full"
            onClick={() => oauth("google")}>
            Sign up with Google
          </Button>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </FieldDescription>
        </form>
      </CardContent>
    </Card>
  );
}
