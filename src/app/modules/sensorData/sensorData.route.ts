import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { sensorDataController } from "./sensorData.controller";
import { sensorDataValidations } from "./sensorData.validation";

const router = express.Router();

const ownerOrAdmin = auth("admin", "farmer");

/**
 * These routes previously had no authentication at all: anyone could inject
 * readings for any field, or read every farm's data.
 */

// Seeding and testing only — devices publish over MQTT, not HTTP.
router.post(
  "/",
  auth("admin"),
  validateRequest(sensorDataValidations.createTelemetryValidationSchema),
  sensorDataController.createTelemetry
);

// "/latest" and "/series" precede nothing ambiguous, but are grouped for clarity.
router.get(
  "/field/:fieldId/latest",
  ownerOrAdmin,
  sensorDataController.getLatestByField
);

router.get(
  "/field/:fieldId/recent",
  ownerOrAdmin,
  sensorDataController.getRecentEntriesByField
);

// Downsampled buckets for charts.
router.get(
  "/field/:fieldId/series",
  ownerOrAdmin,
  sensorDataController.getAggregatedSeries
);

// Raw readings within a window.
router.get(
  "/field/:fieldId",
  ownerOrAdmin,
  sensorDataController.getEntriesByField
);

export const SensorDataRoutes = router;
