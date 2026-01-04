import { NextRequest, NextResponse } from "next/server";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

interface UpdateAccountRequest {
  email?: string;
  password?: string;
  fullName?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateUpdateAccountRequest(body: unknown): UpdateAccountRequest | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }

  const { email, password, fullName } = body as Record<string, unknown>;
  const request: UpdateAccountRequest = {};

  // Validate email if provided
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return { error: "Email must be a non-empty string" };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { error: "Invalid email format" };
    }
    request.email = email.trim();
  }

  // Validate password if provided
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
    }
    request.password = password;
  }

  // Validate fullName if provided
  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      return { error: "Full name must be a non-empty string" };
    }
    request.fullName = fullName.trim();
  }

  // Check that at least one field is provided
  if (Object.keys(request).length === 0) {
    return { error: "At least one field to update is required" };
  }

  return request;
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateUpdateAccountRequest(body);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password, fullName } = validation;
    let updatedUser: User = user;

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;

    // Update user metadata and credentials
    const metadata = fullName ? { full_name: fullName } : undefined;
    const { data, error: updateError } = await supabase.auth.updateUser({
      ...updatePayload,
      ...(metadata && { data: metadata }),
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (data.user) {
      updatedUser = data.user;
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
