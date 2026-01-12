import { APIError, authenticationError, handleAPIError } from "@/lib/api/errors";
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validateObject,
  validatePassword,
  validateString,
} from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";

interface UpdateAccountRequest {
  email?: string;
  password?: string;
  fullName?: string;
}

function validateUpdateAccountRequest(body: unknown): UpdateAccountRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { email, password, fullName } = body as Record<string, unknown>;
  const request: UpdateAccountRequest = {};

  if (email !== undefined) {
    if (!validateEmail(email)) {
      throw new APIError("Email must be a valid email address", 400);
    }
    request.email = email.trim();
  }

  if (password !== undefined) {
    if (!validatePassword(password)) {
      throw new APIError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`, 400);
    }
    request.password = password;
  }

  if (fullName !== undefined) {
    if (!validateString(fullName)) {
      throw new APIError("Full name must be a non-empty string", 400);
    }
    request.fullName = fullName.trim();
  }

  if (Object.keys(request).length === 0) {
    throw new APIError("At least one field to update is required", 400);
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
      return authenticationError();
    }

    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) {
      throw bodyResult.error;
    }

    const { email, password, fullName } = validateUpdateAccountRequest(bodyResult.value);
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
      throw new APIError(updateError.message, 400);
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
    return handleAPIError(error);
  }
}
