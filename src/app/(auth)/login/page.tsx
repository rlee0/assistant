"use client";

import { SignUpForm } from "@/components/login-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <SignUpForm className="w-full max-w-md" />
    </div>
  );
}
