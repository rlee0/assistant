"use client";

import { ForgotPasswordForm } from "@/features/auth";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <ForgotPasswordForm className="w-full max-w-md" />
    </div>
  );
}
