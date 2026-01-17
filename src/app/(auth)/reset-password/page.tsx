"use client";

import { ResetPasswordForm } from "@/features/auth";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <ResetPasswordForm className="w-full max-w-md" />
    </div>
  );
}
