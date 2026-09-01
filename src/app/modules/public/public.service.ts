import { createHash } from "crypto";

import { TelemetryModel } from "../sensorData/sensorData.model";
import { FieldModel } from "../fields/fields.model";
import { AdvisorySessionModel } from "../advisorySession/advisorySession.model";
import { UserModel } from "../user/user.model";
import { IPublicReading, IPublicStats } from "./public.interface";

/**
 * A stable, meaningless display name for a real field.
 *
 * Hashing the id keeps the label constant across polls — so the hero does not
 * appear to jump between houses every few seconds — while giving a visitor no
 * way to recover which field it is.
 */
const displayLabel = (fieldId: string): string => {
  const digest = createHash("sha256").update(fieldId).digest();
  return `Greenhouse ${String((digest[0] % 24) + 1).padStart(2, "0")}`;
};

/**
 * The most recent reading on the platform, stripped of identity.
 *
 * Sorting a time-series collection by `ts` alone uses the clustered time index,
 * so this stays cheap however many farms are reporting.
 */
const getLatestPublicReadingFromDB =
  async (): Promise<IPublicReading | null> => {
    // Scoped to fields that still exist. Readings can outlive their field —
    // a device retired, or telemetry that arrived before the mapping was in
    // place — and the landing page must not advertise a phantom greenhouse.
    const liveFieldIds = await FieldModel.distinct("fieldId", {
      isDeleted: false,
    });

    const latest = await TelemetryModel.findOne({
      "meta.fieldId": { $in: liveFieldIds },
    })
      .sort({ ts: -1 })
      .lean<{
        ts: Date;
        meta: { fieldId: string };
        temperature?: number;
        humidity?: number;
        soilMoisture?: number;
        lightIntensity?: number;
      }>();

    if (!latest) return null;

    return {
      label: displayLabel(latest.meta.fieldId),
      ts: latest.ts,
      temperature: latest.temperature ?? null,
      humidity: latest.humidity ?? null,
      soilMoisture: latest.soilMoisture ?? null,
      lightIntensity: latest.lightIntensity ?? null,
    };
  };

/**
 * Landing-page counters. Run together because they are independent and the
 * page cannot render until all four are known.
 */
const getPublicStatsFromDB = async (): Promise<IPublicStats> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [fieldsMonitored, readingsLast24h, advisorySessionsResolved, verifiedExperts] =
    await Promise.all([
      FieldModel.countDocuments({ isDeleted: false, fieldStatus: "active" }),
      TelemetryModel.countDocuments({ ts: { $gte: since } }),
      AdvisorySessionModel.countDocuments({ status: "resolved", isDeleted: false }),
      UserModel.countDocuments({ role: "expert", expertStatus: "verified", status: "active" }),
    ]);

  return {
    fieldsMonitored,
    readingsLast24h,
    advisorySessionsResolved,
    verifiedExperts,
  };
};

export const publicServices = {
  getLatestPublicReadingFromDB,
  getPublicStatsFromDB,
};
