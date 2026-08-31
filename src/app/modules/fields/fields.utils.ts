import httpStatus from "http-status";
import axios from "axios";

import { UserModel } from "../user/user.model";
import { FieldModel } from "./fields.model";
import { TelemetryModel } from "../sensorData/sensorData.model";
import AppError from "../../errors/AppError";

/** The authenticated caller, resolved by the auth middleware. */
export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

export type TFieldInfo = {
  fieldCrop?: string;
  soilType?: string;
  fieldSizeInAcres?: string;
  latitude: number;
  longitude: number;
  sensorData?: {
    temperature?: string;
    humidity?: string;
    soilMoisture?: string;
    lightIntensity?: string;
  };
  userId?: string;
  role?: "admin" | "farmer";
};

export const isAdmin = (actor: TActor): boolean => actor.role === "admin";

/** Confirms a userCode belongs to a real, active farmer before assigning ownership. */
export const assertFarmerExists = async (farmerCode: string): Promise<void> => {
  const farmer = await UserModel.findOne({
    userCode: farmerCode,
    role: "farmer",
    isDeleted: false,
  });
  if (!farmer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No active farmer with id ${farmerCode}`
    );
  }
};

/** Loads a field and enforces that a non-admin caller owns it. */
export const getOwnedField = async (fieldId: string, actor: TActor) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }
  if (!isAdmin(actor) && field.farmerId !== actor.userCode) {
    throw new AppError(httpStatus.FORBIDDEN, "This field does not belong to you");
  }
  return field;
};

/* ===========================================================================
 * Field advisory: context gathering and prompt assembly
 * ========================================================================= */

export type TSoilProfile = {
  clay: number;
  silt: number;
  sand: number;
  ph: number;
  organicCarbon: number;
} | null;

/**
 * Soil composition for a coordinate from ISRIC SoilGrids.
 *
 * Cached indefinitely by rounded coordinate: this is geological survey data on
 * a fixed grid, so re-fetching it per request was pure waste in the previous
 * implementation.
 */
const soilCache = new Map<string, TSoilProfile>();

export const getSoilProfile = async (
  latitude: number,
  longitude: number
): Promise<TSoilProfile> => {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (soilCache.has(key)) return soilCache.get(key) as TSoilProfile;

  try {
    const { data } = await axios.get(
      "https://rest.isric.org/soilgrids/v2.0/properties/query",
      {
        timeout: 25_000,
        headers: { accept: "application/json" },
        params: {
          lat: latitude,
          lon: longitude,
          property: ["clay", "silt", "sand", "phh2o", "soc"],
          depth: "0-5cm",
          value: "mean",
        },
      }
    );

    const layers = data?.properties?.layers ?? [];

    /**
     * SoilGrids scales values by 10, and returns null where the grid has no
     * coverage — built-up land, for instance. Null must stay null: coercing it
     * to zero would tell the advisor the soil has pH 0, which is worse than
     * telling it the profile is unknown.
     */
    const mean = (name: string): number | null => {
      const raw = layers.find((l: { name: string }) => l.name === name)
        ?.depths?.[0]?.values?.mean;
      return typeof raw === "number" ? raw / 10 : null;
    };

    const clay = mean("clay");
    const silt = mean("silt");
    const sand = mean("sand");
    const ph = mean("phh2o");
    const organicCarbon = mean("soc");

    // Partial coverage is not useful either; treat the profile as absent
    // unless the core values are all present.
    const profile: TSoilProfile =
      clay !== null && silt !== null && sand !== null && ph !== null
        ? { clay, silt, sand, ph, organicCarbon: organicCarbon ?? 0 }
        : null;

    soilCache.set(key, profile);
    return profile;
  } catch {
    // Soil data is enriching context, not a hard requirement — an outage
    // should degrade the advice, not fail the request.
    soilCache.set(key, null);
    return null;
  }
};

/** Most recent stored reading, used as the "now" the advice is written against. */
export const getLatestReadingForField = async (fieldId: string) =>
  TelemetryModel.findOne({ "meta.fieldId": fieldId }).sort({ ts: -1 }).lean();

const FIELD_ADVISOR_PROMPT = `You advise growers on individual fields inside a precision-farming platform. You are given one field's crop, environment, most recent sensor reading and soil profile, and you write what the grower should do about it.

Lead with the action. Be quantitative — amounts, timings and thresholds, not "monitor closely". Reason from the numbers you are given and name them, so the grower can see why you concluded what you did.

If a reading is missing, say what you would need rather than inventing it. Never invent a chemical dose; name the active ingredient and send them to the label.

Write in English. Plain sentences, no headings, no bullet lists unless there are genuinely separate actions.`;

/** Assembles the prompt for one field's advisory. */
export const buildFieldInsightPrompt = (
  field: {
    fieldName: string;
    fieldCrop: string;
    environmentType: string;
    soilType?: string;
    fieldSizeInAcres?: number;
    region?: string;
  },
  latest: {
    ts?: Date;
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    lightIntensity?: number;
  } | null,
  soil: TSoilProfile,
  detail: "brief" | "full"
) => {
  const lines = [
    `Field: ${field.fieldName}`,
    `Crop: ${field.fieldCrop}`,
    `Environment: ${field.environmentType.replace("_", " ")}`,
    field.soilType ? `Soil type on record: ${field.soilType}` : null,
    field.fieldSizeInAcres ? `Size: ${field.fieldSizeInAcres} acres` : null,
    field.region ? `Region: ${field.region}` : null,
    "",
    latest
      ? `Latest reading (${new Date(latest.ts as Date).toISOString()}):
- Temperature: ${latest.temperature ?? "not reported"} °C
- Humidity: ${latest.humidity ?? "not reported"} %
- Soil moisture: ${latest.soilMoisture ?? "not reported"} %
- Light: ${latest.lightIntensity ?? "not reported"} lux`
      : "No sensor readings have arrived for this field yet.",
    "",
    soil
      ? `Soil profile at these coordinates (SoilGrids, 0-5cm):
- Clay ${soil.clay.toFixed(1)}%, silt ${soil.silt.toFixed(1)}%, sand ${soil.sand.toFixed(1)}%
- pH ${soil.ph.toFixed(1)}
- Organic carbon ${soil.organicCarbon.toFixed(1)} g/kg`
      : "Soil profile unavailable for these coordinates.",
    "",
    detail === "brief"
      ? "Give the single most useful action in under 60 words."
      : "Give a fuller assessment in under 250 words: what to do now, what to watch, and what would change your advice.",
  ].filter(Boolean);

  return [
    { role: "system" as const, content: FIELD_ADVISOR_PROMPT },
    { role: "user" as const, content: lines.join("\n") },
  ];
};
