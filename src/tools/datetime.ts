import { tool } from "ai";
import { z } from "zod";

/**
 * Configuration options for the getDateTime tool
 */
type DateTimeToolOptions = {
  /** Default format for datetime output */
  format?: "iso" | "locale" | "timestamp" | "utc";
  /** Default IANA timezone identifier */
  timezone?: string;
};

/**
 * Return type for the datetime tool execution
 */
type DateTimeResult = {
  /** Formatted datetime string in the requested format */
  datetime: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** IANA timezone identifier used for formatting */
  timezone: string;
  /** Format applied to the datetime */
  format: "iso" | "locale" | "timestamp" | "utc";
  /** ISO 8601 UTC representation */
  iso: string;
  /** Human-readable description */
  description: string;
};

/**
 * Validates an IANA timezone identifier
 * @param tz - Timezone string to validate
 * @returns true if valid, false otherwise
 */
function isValidTimezone(tz: string): boolean {
  if (typeof tz !== "string" || tz.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (error) {
    // Silently return false for invalid timezone
    return false;
  }
}

/**
 * Formats a date according to the specified format and timezone
 * @param date - Date to format
 * @param format - Output format
 * @param timezone - Optional IANA timezone
 * @returns Formatted datetime string
 */
function formatDateTime(
  date: Date,
  format: "iso" | "locale" | "timestamp" | "utc",
  timezone?: string
): string {
  const timestamp = date.getTime();

  switch (format) {
    case "timestamp":
      return timestamp.toString();
    case "utc":
      return date.toUTCString();
    case "locale":
      return timezone
        ? date.toLocaleString("en-US", { timeZone: timezone })
        : date.toLocaleString("en-US");
    case "iso":
    default:
      // ISO format is always in UTC; timezone affects display via locale formatting
      return date.toISOString();
  }
}

/**
 * Get current date and time tool for AI SDK
 * Provides the current date and time in various formats with timezone support
 *
 * @param options - Configuration options for default behavior
 * @returns AI SDK tool for getting current datetime
 *
 * @example
 * ```typescript
 * const dateTimeTool = getDateTime({ format: "locale", timezone: "America/New_York" });
 * ```
 */
export const getDateTime = ({ format = "iso", timezone }: DateTimeToolOptions = {}) =>
  tool({
    description:
      "Get the current date and time. Returns datetime in various formats (ISO 8601, locale-specific, Unix timestamp, or UTC). Supports timezone conversion using IANA timezone identifiers.",
    inputSchema: z.object({
      format: z
        .enum(["iso", "locale", "timestamp", "utc"])
        .optional()
        .describe(
          "Format for the datetime output: 'iso' (ISO 8601 UTC), 'locale' (human-readable with timezone), 'timestamp' (Unix milliseconds), or 'utc' (UTC string)"
        ),
      timezone: z
        .string()
        .optional()
        .describe(
          "IANA timezone identifier (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo'). If not provided, uses system timezone."
        ),
    }),
    execute: async ({ format: requestFormat, timezone: requestTimezone }) => {
      // Validate inputs
      if (
        requestFormat &&
        !(["iso", "locale", "timestamp", "utc"] as const).includes(requestFormat)
      ) {
        throw new Error(
          `Invalid format: '${requestFormat}'. Must be one of: iso, locale, timestamp, utc`
        );
      }

      const now = new Date();
      const useFormat = requestFormat ?? format;
      const useTimezone = requestTimezone ?? timezone;

      // Validate timezone if provided
      if (useTimezone && !isValidTimezone(useTimezone)) {
        throw new Error(
          `Invalid timezone identifier: '${useTimezone}'. Please provide a valid IANA timezone (e.g., 'America/New_York').`
        );
      }

      const timestamp = now.getTime();
      const resolvedTimezone = useTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedDateTime = formatDateTime(now, useFormat, useTimezone);

      const result: DateTimeResult = {
        datetime: formattedDateTime,
        timestamp,
        timezone: resolvedTimezone,
        format: useFormat,
        iso: now.toISOString(),
        description: `Current date and time: ${formattedDateTime}${
          useTimezone ? ` (${resolvedTimezone})` : ""
        }`,
      };

      return result;
    },
  });
