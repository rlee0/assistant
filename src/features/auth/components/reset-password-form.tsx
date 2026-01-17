"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { MIN_PASSWORD_LENGTH } from "@/lib/api/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { logError } from "@/lib/logging";
import { useManualProgress } from "@/hooks/use-navigation-progress";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ ...props }: React.ComponentProps<typeof Card>) {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      logError("[ResetPasswordForm]", "Failed to initialize Supabase client", error);
      return null;
    }
  }, []);

  const router = useRouter();
  const { startProgress, completeProgress } = useManualProgress();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const isDisabled = isLoading || !supabase || !isValidToken;

  useEffect(() => {
    async function validateSession() {
      if (!supabase) {
        setError("Authentication service is unavailable.");
        setIsValidating(false);
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          logError("[ResetPasswordForm]", "Invalid or expired reset token", sessionError);
          setError("This password reset link is invalid or has expired. Please request a new one.");
          setIsValidToken(false);
        } else {
          setIsValidToken(true);
        }
      } catch (err) {
        logError("[ResetPasswordForm]", "Failed to validate session", err);
        setError("Failed to validate reset token. Please try again.");
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    }

    validateSession();
  }, [supabase]);

  function validateForm(): string | null {
    if (!password) {
      return "Password is required.";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
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
    startProgress();

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        logError("[ResetPasswordForm]", "Password update failed", updateError);
        setError("Failed to update password. Please try again.");
        setIsLoading(false);
        completeProgress();
        return;
      }

      // Password updated successfully, user is now logged in
      // Redirect to chat page
      router.push("/chat");
      router.refresh();
    } catch (err) {
      logError("[ResetPasswordForm]", "Unexpected error during password reset", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
      completeProgress();
    }
  }

  if (isValidating) {
    return (
      <Card className="w-full max-w-md" {...props}>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Validating reset link...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isValidToken) {
    return (
      <Card className="w-full max-w-md" {...props}>
        <CardHeader>
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <LoadingButton
              onClick={() => router.push("/forgot-password")}
              className="w-full"
              variant="outline">
              Request new reset link
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" {...props}>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <FieldDescription>
              Must be at least {MIN_PASSWORD_LENGTH} characters long.
            </FieldDescription>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDisabled}
              autoComplete="new-password"
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isDisabled}
              autoComplete="new-password"
            />
          </Field>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <LoadingButton
            type="submit"
            className="w-full"
            disabled={isDisabled}
            isLoading={isLoading}>
            Reset password
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
