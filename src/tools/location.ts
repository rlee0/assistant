import { tool } from "ai";
import { z } from "zod";

/**
 * Configuration options for the getLocation tool
 */
type LocationToolOptions = {
  /** Default timeout for location request in milliseconds */
  timeout?: number;
  /** Enable high accuracy GPS data (uses more battery) */
  enableHighAccuracy?: boolean;
};

/**
 * Return type for the location tool execution
 */
type LocationResult = {
  /** Latitude coordinate (-90 to 90) */
  latitude: number;
  /** Longitude coordinate (-180 to 180) */
  longitude: number;
  /** Accuracy of the location in meters (always positive) */
  accuracy: number;
  /** Altitude above sea level in meters (if available) */
  altitude?: number;
  /** Accuracy of altitude in meters (if available) */
  altitudeAccuracy?: number;
  /** Direction of travel in degrees 0-359 (if available) */
  heading?: number;
  /** Speed of movement in meters per second (if available, always non-negative) */
  speed?: number;
  /** Timestamp of the location data (Unix milliseconds) */
  timestamp: number;
  /** Human-readable description */
  description: string;
};

/**
 * Validates geographic coordinates for correctness
 */
function validateCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid coordinates: latitude and longitude must be finite numbers");
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180`);
  }
}

/**
 * Checks if code is running in a browser environment
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

/**
 * Maps Geolocation API error codes to user-friendly messages
 */
function getGeolocationErrorMessage(code: number, message?: string): string {
  const messages: Record<number, string> = {
    1: "User denied location permission",
    2: "Location unavailable (check GPS/network)",
    3: "Location request timed out",
  };
  return messages[code] || message || "Unknown geolocation error";
}

/**
 * Get user's geolocation using the Geolocation API
 * Returns coordinates, accuracy, and optional additional positioning data
 *
 * @param options - Configuration options for location request
 * @returns AI SDK tool for getting user location
 *
 * @example
 * ```typescript
 * const locationTool = getLocation({ timeout: 10000, enableHighAccuracy: true });
 * ```
 */
export const getLocation = ({
  timeout = 10000,
  enableHighAccuracy = false,
}: LocationToolOptions = {}) =>
  tool({
    description:
      "Get the user's current geographic location using the browser's Geolocation API. Returns latitude, longitude, accuracy, and optional altitude/heading/speed data. Requires user permission.",
    inputSchema: z.object({
      timeout: z
        .number()
        .int()
        .positive()
        .max(60000)
        .optional()
        .describe(
          "Maximum time to wait for location in milliseconds (1-60000). Defaults to 10000ms."
        ),
      enableHighAccuracy: z
        .boolean()
        .optional()
        .describe(
          "If true, uses high accuracy GPS data which consumes more battery. Defaults to false."
        ),
    }),
    execute: async ({ timeout: requestTimeout, enableHighAccuracy: requestHighAccuracy }) => {
      // Validate environment
      if (!isBrowserEnvironment() || !navigator.geolocation) {
        throw new Error(
          "Geolocation API is not available. This tool can only be used in a browser environment with geolocation support."
        );
      }

      const useTimeout = requestTimeout ?? timeout;
      const useHighAccuracy = requestHighAccuracy ?? enableHighAccuracy;

      const timeoutId = setTimeout(() => {}, useTimeout);

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          const successCallback = (pos: GeolocationPosition) => resolve(pos);
          const errorCallback = (err: GeolocationPositionError) => {
            reject(new Error(getGeolocationErrorMessage(err.code, err.message)));
          };

          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
            enableHighAccuracy: useHighAccuracy,
            timeout: useTimeout,
            maximumAge: 0,
          });
        });

        const { coords, timestamp } = position;

        // Validate coordinates
        validateCoordinates(coords.latitude, coords.longitude);

        const result: LocationResult = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude ?? undefined,
          altitudeAccuracy: coords.altitudeAccuracy ?? undefined,
          heading: coords.heading !== null && coords.heading >= 0 ? coords.heading : undefined,
          speed: coords.speed !== null && coords.speed >= 0 ? coords.speed : undefined,
          timestamp,
          description: `Location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(
            6
          )} (±${Math.round(coords.accuracy)}m)`,
        };

        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Unexpected error during geolocation request");
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
