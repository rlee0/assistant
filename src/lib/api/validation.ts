/**
 * Standard validation patterns and utilities for API requests
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.trim() !== "" && EMAIL_REGEX.test(email);
}

export function validatePassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

export function validateString(value: unknown, allowEmpty = false): value is string {
  if (typeof value !== "string") return false;
  return allowEmpty || value.trim() !== "";
}

export function validateBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function validateArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function validateUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function validateNonEmptyObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && Object.keys(obj).length > 0;
}

export function validateObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null;
}
