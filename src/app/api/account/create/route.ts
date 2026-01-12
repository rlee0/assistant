import { APIError, handleAPIError } from "@/lib/api/errors";
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validateObject,
  validatePassword,
  validateString,
} from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";

interface CreateAccountRequest {
  email: string;
  password: string;
  fullName: string;
}

function validateCreateAccountRequest(body: unknown): CreateAccountRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { email, password, fullName } = body as Record<string, unknown>;

  if (!validateEmail(email)) {
    throw new APIError("Email is required and must be valid", 400);
  }

  if (!validatePassword(password)) {
    throw new APIError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`, 400);
  }

  if (!validateString(fullName)) {
    throw new APIError("Full name is required", 400);
  }

  return { email: email.trim(), password, fullName: fullName.trim() };
}

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) {
      throw bodyResult.error;
    }

    const validation = validateCreateAccountRequest(bodyResult.value);
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
      throw new APIError(signUpError.message, 400);
    }

    if (!data.user) {
      throw new APIError("Failed to create account", 500);
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
    return handleAPIError(error);
  }
}
