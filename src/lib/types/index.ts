/**
 * Shared Type Definitions
 *
 * Common types used across multiple features and modules in the application.
 * Feature-specific types should be defined in their respective feature directories.
 *
 * @module lib/types
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Generic ID type for database entities
 */
export type ID = string;

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Generic error shape for API responses
 */
export interface APIError {
  readonly message: string;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Generic success response shape
 */
export interface APIResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: APIError;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

/**
 * Paginated response shape
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  readonly meta?: PaginationMeta;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties of T readonly recursively
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract readonly array element type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;
