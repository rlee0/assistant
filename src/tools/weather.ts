import { tool } from "ai";
import { z } from "zod";

/**
 * Weather units supported by the tool
 */
type WeatherUnits = "metric" | "imperial";

/**
 * Response shape for the weather tool
 */
type WeatherResult = {
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  units: WeatherUnits;
  provider: "open-meteo";
  description: string;
};

/**
 * Maps friendly unit selection to Open-Meteo query params
 */
function mapUnits(units: WeatherUnits) {
  return units === "imperial"
    ? { temperature: "fahrenheit", wind: "mph" as const }
    : { temperature: "celsius", wind: "kmh" as const };
}

/**
 * Convert Open-Meteo current weather payload into our result
 */
function buildResult(
  latitude: number,
  longitude: number,
  units: WeatherUnits,
  data: {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
      weather_code?: number;
    };
  }
): WeatherResult {
  const current = data.current ?? {};

  const temperature = current.temperature_2m;
  const apparentTemperature = current.apparent_temperature;
  const humidity = current.relative_humidity_2m;
  const windSpeed = current.wind_speed_10m;
  const weatherCode = current.weather_code;

  if (
    temperature === undefined ||
    apparentTemperature === undefined ||
    humidity === undefined ||
    windSpeed === undefined ||
    weatherCode === undefined
  ) {
    throw new Error("Weather data is unavailable for the requested coordinates");
  }

  return {
    latitude,
    longitude,
    temperature,
    apparentTemperature,
    humidity,
    windSpeed,
    weatherCode,
    units,
    provider: "open-meteo",
    description: `Weather: ${temperature}°, feels like ${apparentTemperature}°, humidity ${humidity}%, wind ${windSpeed} ${
      units === "imperial" ? "mph" : "km/h"
    }`,
  };
}

/**
 * Get current weather for latitude/longitude using Open-Meteo (no API key required)
 */
export const getWeather = () =>
  tool({
    description:
      "Get current weather for a latitude/longitude using Open-Meteo (no API key needed). Returns temperature, feels-like, humidity, wind speed, and weather code.",
    inputSchema: z.object({
      latitude: z.number().min(-90).max(90).describe("Latitude between -90 and 90"),
      longitude: z.number().min(-180).max(180).describe("Longitude between -180 and 180"),
      units: z
        .enum(["metric", "imperial"])
        .default("metric")
        .describe("Units: metric (C, km/h) or imperial (F, mph). Defaults to metric."),
    }),
    execute: async ({ latitude, longitude, units }) => {
      const mappedUnits = mapUnits(units);
      const searchParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          "temperature_2m",
          "apparent_temperature",
          "relative_humidity_2m",
          "wind_speed_10m",
          "weather_code",
        ].join(","),
        temperature_unit: mappedUnits.temperature,
        wind_speed_unit: mappedUnits.wind,
      });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Weather lookup failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as unknown;

      // Basic shape validation before accessing fields
      if (!data || typeof data !== "object") {
        throw new Error("Weather provider returned an invalid response");
      }

      return buildResult(latitude, longitude, units, data as Record<string, unknown>);
    },
  });
