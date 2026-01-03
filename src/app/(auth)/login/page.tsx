"use client";

import { LoginForm } from "@/components/login-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <LoginForm className="w-full max-w-md" />
    </div>
  );
}
