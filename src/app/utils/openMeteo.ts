import axios from "axios";
import httpStatus from "http-status";

import AppError from "../errors/AppError";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** Hours of hourly detail returned. The API offers 168; two days is plenty. */
const HOURLY_HOURS = 48;

/** Weather changes slowly and Open-Meteo refreshes about hourly. */
const CACHE_TTL_MS = 30 * 60 * 1000;

export type TWeatherNow = {
  time: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
};

export type TWeatherHour = {
  time: string;
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  weatherCode: number;
  description: string;
};

export type TWeatherDay = {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  weatherCode: number;
  description: string;
};

export type TFieldWeather = {
  latitude: number;
  longitude: number;
  timezone: string;
  elevation: number;
  units: { temperature: string; windSpeed: string; precipitation: string };
  current: TWeatherNow;
  hourly: TWeatherHour[];
  daily: TWeatherDay[];
  fetchedAt: string;
};

/** WMO weather interpretation codes, which the API returns as bare numbers. */
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const describe = (code: number): string =>
  WMO_DESCRIPTIONS[code] ?? "Unknown conditions";

/**
 * Cached by rounded coordinate rather than by field: two fields on the same
 * farm share weather, and there is no reason to fetch it twice. Two decimals
 * is roughly a kilometre, well inside the model's resolution.
 *
 * In-process only — a second server instance would keep its own copy.
 */
const cache = new Map<string, { expiresAt: number; data: TFieldWeather }>();

const cacheKey = (lat: number, lon: number): string =>
  `${lat.toFixed(2)},${lon.toFixed(2)}`;

/**
 * Open-Meteo returns parallel arrays — time[], temperature[], humidity[] —
 * which is compact to transfer but awkward to consume. They are zipped into
 * records here so the shape crossing into the app is already usable.
 */
const zipHourly = (hourly: Record<string, unknown[]>): TWeatherHour[] => {
  const times = (hourly.time ?? []) as string[];
  return times.slice(0, HOURLY_HOURS).map((time, i) => {
    const code = Number((hourly.weather_code as number[])?.[i] ?? 0);
    return {
      time,
      temperature: Number((hourly.temperature_2m as number[])?.[i] ?? 0),
      humidity: Number((hourly.relative_humidity_2m as number[])?.[i] ?? 0),
      precipitationProbability: Number(
        (hourly.precipitation_probability as number[])?.[i] ?? 0
      ),
      weatherCode: code,
      description: describe(code),
    };
  });
};

const zipDaily = (daily: Record<string, unknown[]>): TWeatherDay[] => {
  const dates = (daily.time ?? []) as string[];
  return dates.map((date, i) => {
    const code = Number((daily.weather_code as number[])?.[i] ?? 0);
    return {
      date,
      temperatureMax: Number((daily.temperature_2m_max as number[])?.[i] ?? 0),
      temperatureMin: Number((daily.temperature_2m_min as number[])?.[i] ?? 0),
      precipitationSum: Number((daily.precipitation_sum as number[])?.[i] ?? 0),
      precipitationProbabilityMax: Number(
        (daily.precipitation_probability_max as number[])?.[i] ?? 0
      ),
      weatherCode: code,
      description: describe(code),
    };
  });
};

/**
 * Current conditions plus 48 hours and 7 days of forecast for one coordinate.
 *
 * `timezone=auto` is requested deliberately: the API defaults to GMT, and a
 * farmer reading "rain at 14:00" needs that to mean local afternoon.
 */
export const fetchWeatherForCoordinates = async (
  latitude: number,
  longitude: number
): Promise<TFieldWeather> => {
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let payload;
  try {
    const response = await axios.get(BASE_URL, {
      timeout: 10_000,
      params: {
        latitude,
        longitude,
        current:
          "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        hourly:
          "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
        forecast_days: 7,
        timezone: "auto",
      },
    });
    payload = response.data;
  } catch (error) {
    // Serve stale data rather than failing the field page: a slightly old
    // forecast is far more useful to a farmer than an error.
    if (cached) return cached.data;

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `Weather service unavailable: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  const currentCode = Number(payload.current?.weather_code ?? 0);

  const data: TFieldWeather = {
    latitude: payload.latitude,
    longitude: payload.longitude,
    timezone: payload.timezone,
    elevation: payload.elevation,
    units: {
      temperature: payload.current_units?.temperature_2m ?? "°C",
      windSpeed: payload.current_units?.wind_speed_10m ?? "km/h",
      precipitation: payload.current_units?.precipitation ?? "mm",
    },
    current: {
      time: payload.current?.time,
      temperature: Number(payload.current?.temperature_2m ?? 0),
      humidity: Number(payload.current?.relative_humidity_2m ?? 0),
      precipitation: Number(payload.current?.precipitation ?? 0),
      windSpeed: Number(payload.current?.wind_speed_10m ?? 0),
      weatherCode: currentCode,
      description: describe(currentCode),
    },
    hourly: zipHourly(payload.hourly ?? {}),
    daily: zipDaily(payload.daily ?? {}),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
};
