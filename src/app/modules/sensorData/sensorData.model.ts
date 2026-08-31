import { Schema, model } from "mongoose";
import { ITelemetry } from "./sensorData.interface";

/**
 * A MongoDB time-series collection, not a regular one.
 *
 * `metaField` carries the series identity and is indexed; the numeric readings
 * are not. This is the equivalent of InfluxDB tags versus fields, and getting
 * it wrong was why the previous implementation had to scan a year of every
 * farm's data and filter it in application memory.
 *
 * The options below take effect only when the collection is created. Mongoose
 * will bind silently to an existing regular collection of the same name and
 * give no error, so the name must be fresh.
 */
const telemetrySchema = new Schema<ITelemetry>(
  {
    ts: { type: Date, required: true },
    meta: {
      farmerId: { type: String, required: true },
      fieldId: { type: String, required: true },
      deviceId: { type: String },
    },
    temperature: { type: Number },
    humidity: { type: Number },
    soilMoisture: { type: Number },
    lightIntensity: { type: Number },
  },
  {
    timeseries: {
      timeField: "ts",
      metaField: "meta",
      granularity: "seconds",
    },
    // Raw readings are kept for 90 days and then removed by MongoDB itself.
    expireAfterSeconds: 60 * 60 * 24 * 90,
    autoCreate: true,
    versionKey: false,
  }
);

export const TelemetryModel = model<ITelemetry>(
  "Telemetry",
  telemetrySchema,
  "telemetry"
);
