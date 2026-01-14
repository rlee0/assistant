/**
 * Centralized API route definitions
 *
 * Ensures consistency and type safety across the application.
 * Changes to API routes only need to be made in one place.
 */

export const API_ROUTES = {
  // Chat operations
  CHAT: {
    CREATE: "/api/chat/create",
    UPDATE: "/api/chat/update",
    DELETE: "/api/chat/delete",
  },
  // Settings
  SETTINGS: "/api/settings",
  // Models
  MODELS: "/api/models",
  // Authentication
  AUTH: {
    LOGOUT: "/api/auth/logout",
  },
  // Account
  ACCOUNT: {
    DELETE: "/api/account/delete",
  },
} as const;

/**
 * Type-safe API route builder
 *
 * @example
 * ```ts
 * const url = API_ROUTES.CHAT.CREATE;
 * const response = await fetch(url, { method: "POST" });
 * ```
 */
export function getApiRoute(path: keyof typeof API_ROUTES | string): string {
  if (typeof path === "string" && !path.startsWith("/")) {
    return `/api/${path}`;
  }
  if (typeof path === "string") {
    return path;
  }
  // Handle nested routes
  const route = API_ROUTES[path as keyof typeof API_ROUTES];
  return typeof route === "string" ? route : String(route);
}
