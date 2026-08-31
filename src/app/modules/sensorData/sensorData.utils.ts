import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { FieldModel } from "../fields/fields.model";
import { ITelemetry, TTelemetryRange } from "./sensorData.interface";

export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

const RANGE_MS: Record<TTelemetryRange, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const rangeStart = (range: TTelemetryRange): Date =>
  new Date(Date.now() - RANGE_MS[range]);

/**
 * Bucket width chosen so any window returns roughly 100–300 points. Without
 * this a 30-day chart at one reading every five seconds would return about
 * half a million documents to draw a few hundred pixels.
 */
export const bucketUnitFor = (
  range: TTelemetryRange
): { unit: "minute" | "hour"; binSize: number } => {
  switch (range) {
    case "1h":
      return { unit: "minute", binSize: 1 };
    case "24h":
      return { unit: "minute", binSize: 10 };
    case "7d":
      return { unit: "hour", binSize: 1 };
    case "30d":
      return { unit: "hour", binSize: 4 };
    case "90d":
      return { unit: "hour", binSize: 12 };
  }
};

/**
 * Telemetry is readable by whoever owns the field it came from; admins may
 * read any. Resolved against the field rather than the reading, so a farmer
 * cannot fetch another farm's data by guessing a field id.
 */
export const assertCanReadField = async (
  fieldId: string,
  actor: TActor
): Promise<void> => {
  if (actor.role === "admin") return;

  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found");
  }
  if (field.farmerId !== actor.userCode) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This field does not belong to you"
    );
  }
};

/**
 * Normalises an inbound device payload into the stored shape.
 *
 * The firmware and the simulator both publish snake_case keys and a flat
 * farmerId/fieldId; keeping that shape out of the domain model means a change
 * on the device side is absorbed here rather than rippling through queries.
 */
export const toTelemetry = (payload: Record<string, unknown>): ITelemetry => {
  const rawTs = payload.timeStamp ?? payload.ts;
  const ts = rawTs ? new Date(rawTs as string) : new Date();

  if (Number.isNaN(ts.getTime())) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid timestamp");
  }

  const num = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  return {
    ts,
    meta: {
      farmerId: String(payload.farmerId ?? ""),
      fieldId: String(payload.fieldId ?? ""),
      deviceId: payload.deviceId ? String(payload.deviceId) : undefined,
    },
    temperature: num(payload.temperature),
    humidity: num(payload.humidity),
    soilMoisture: num(payload.soil_moisture ?? payload.soilMoisture),
    lightIntensity: num(payload.light_intensity ?? payload.lightIntensity),
  };
};
