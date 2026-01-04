import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

interface CreateAccountRequest {
  email: string;
  password: string;
  fullName: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateCreateAccountRequest(body: unknown): CreateAccountRequest | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }

  const { email, password, fullName } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required" };
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Invalid email format" };
  }

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Full name is required" };
  }

  return { email: email.trim(), password, fullName: fullName.trim() };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateAccountRequest(body);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password, fullName } = validation;

    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
