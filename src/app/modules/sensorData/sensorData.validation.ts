import { z } from "zod";

const RANGES = ["1h", "24h", "7d", "30d", "90d"] as const;

export const rangeQuerySchema = z.enum(RANGES).default("24h");

/**
 * Direct ingest over HTTP. The live path is the MQTT subscriber; this exists
 * for seeding and testing, which is why the route is admin-only.
 */
const createTelemetryValidationSchema = z.object({
  body: z
    .object({
      farmerId: z.string().trim().min(1, { message: "farmerId is required" }),
      fieldId: z.string().trim().min(1, { message: "fieldId is required" }),
      deviceId: z.string().trim().optional(),
      temperature: z.number().min(-50).max(150).optional(),
      humidity: z.number().min(0).max(100).optional(),
      soil_moisture: z.number().min(0).max(100).optional(),
      light_intensity: z.number().min(0).max(200000).optional(),
      timeStamp: z
        .string()
        .refine((value) => !Number.isNaN(new Date(value).getTime()), {
          message: "Invalid timestamp format",
        })
        .optional(),
    })
    .strict(),
});

export const sensorDataValidations = {
  createTelemetryValidationSchema,
  rangeQuerySchema,
};
