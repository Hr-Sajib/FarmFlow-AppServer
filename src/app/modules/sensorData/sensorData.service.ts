import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { TelemetryModel } from "./sensorData.model";
import {
  ITelemetry,
  ITelemetryBucket,
  TTelemetryRange,
} from "./sensorData.interface";
import { rangeStart, bucketUnitFor } from "./sensorData.utils";

/** A single reading. Called by the MQTT subscriber for every device message. */
const createTelemetryIntoDB = async (entry: ITelemetry) => {
  if (!entry.meta.farmerId || !entry.meta.fieldId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Telemetry must carry both farmerId and fieldId"
    );
  }
  return TelemetryModel.create(entry);
};

/**
 * Raw readings for a field within a window.
 *
 * Deliberately windowed and capped rather than "all": at one reading every few
 * seconds an unbounded query would return hundreds of thousands of documents.
 * For anything longer than an hour, prefer the aggregated series.
 */
const getEntriesByFieldIdFromDB = async (
  fieldId: string,
  range: TTelemetryRange = "24h",
  limit = 5000
): Promise<ITelemetry[]> =>
  TelemetryModel.find({
    "meta.fieldId": fieldId,
    ts: { $gte: rangeStart(range) },
  })
    .sort({ ts: 1 })
    .limit(limit)
    .lean();

/** The newest N readings, regardless of age. */
const getRecentEntriesByFieldIdFromDB = async (
  fieldId: string,
  limit = 50
): Promise<ITelemetry[]> => {
  const rows = await TelemetryModel.find({ "meta.fieldId": fieldId })
    .sort({ ts: -1 })
    .limit(limit)
    .lean();

  // Returned oldest-first so callers can plot without reversing.
  return rows.reverse();
};

/**
 * The single most recent reading.
 *
 * Dashboard cards need a value the moment the page loads — before the first
 * live message arrives over the socket — otherwise every tile reads 0.00 until
 * the device next publishes.
 */
const getLatestByFieldIdFromDB = async (
  fieldId: string
): Promise<ITelemetry | null> =>
  TelemetryModel.findOne({ "meta.fieldId": fieldId }).sort({ ts: -1 }).lean();

/**
 * Downsampled series for charts: readings are grouped into fixed time buckets
 * and averaged, so a window returns a few hundred points instead of the raw
 * hundreds of thousands.
 */
const getAggregatedSeriesFromDB = async (
  fieldId: string,
  range: TTelemetryRange = "24h"
): Promise<ITelemetryBucket[]> => {
  const { unit, binSize } = bucketUnitFor(range);

  return TelemetryModel.aggregate<ITelemetryBucket>([
    {
      $match: {
        "meta.fieldId": fieldId,
        ts: { $gte: rangeStart(range) },
      },
    },
    {
      $group: {
        _id: { $dateTrunc: { date: "$ts", unit, binSize } },
        temperature: { $avg: "$temperature" },
        humidity: { $avg: "$humidity" },
        soilMoisture: { $avg: "$soilMoisture" },
        lightIntensity: { $avg: "$lightIntensity" },
        samples: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        ts: "$_id",
        // Rounded to two decimals: averaging produces long floats that add
        // response size without adding meaning at sensor precision.
        temperature: { $round: ["$temperature", 2] },
        humidity: { $round: ["$humidity", 2] },
        soilMoisture: { $round: ["$soilMoisture", 2] },
        lightIntensity: { $round: ["$lightIntensity", 2] },
        samples: 1,
      },
    },
  ]);
};

export const sensorDataServices = {
  createTelemetryIntoDB,
  getEntriesByFieldIdFromDB,
  getRecentEntriesByFieldIdFromDB,
  getLatestByFieldIdFromDB,
  getAggregatedSeriesFromDB,
};
