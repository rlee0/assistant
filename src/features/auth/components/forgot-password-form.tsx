"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LoadingButton } from "@/components/ui/loading-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { validateEmail } from "@/lib/api/validation";

export function ForgotPasswordForm({ ...props }: React.ComponentProps<typeof Card>) {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      logError("[ForgotPasswordForm]", "Failed to initialize Supabase client", error);
      return null;
    }
  }, []);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isDisabled = isLoading || !supabase;

  function validateForm(): string | null {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return "Email is required.";
    }

    if (!validateEmail(trimmedEmail)) {
      return "Please enter a valid email address.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
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

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        logError("[ForgotPasswordForm]", "Password reset request failed", resetError);
        setError("Failed to send password reset email. Please try again.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      logError("[ForgotPasswordForm]", "Unexpected error during password reset request", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md" {...props}>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link in the
            email to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}>
                Try another email
              </Button>
              <Button asChild variant="ghost">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" {...props}>
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isDisabled}
              autoComplete="email"
              autoFocus
            />
          </Field>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex flex-col gap-2">
            <LoadingButton
              type="submit"
              className="w-full"
              disabled={isDisabled}
              isLoading={isLoading}>
              Send reset link
            </LoadingButton>
            <Button asChild variant="ghost" disabled={isDisabled}>
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
