/**
 * `npm run seed:telemetry -- <fieldId> <farmerId>`
 *
 * Writes 24 hours of plausible greenhouse readings so charts and trends have
 * something real to draw during development.
 */
import mongoose from "mongoose";
import config from "../config";
import { sensorDataServices } from "../app/modules/sensorData/sensorData.service";

const [, , fieldId, farmerId] = process.argv;

const run = async () => {
  if (!fieldId || !farmerId) {
    console.error("usage: npm run seed:telemetry -- <fieldId> <farmerId>");
    process.exit(1);
  }

  await mongoose.connect(config.database_url as string);

  const now = Date.now();
  const points = 24 * 12; // every 5 minutes for a day
  let written = 0;

  for (let i = points; i >= 0; i--) {
    const ts = new Date(now - i * 5 * 60 * 1000);
    // Daily cycle: warm and bright at midday, humid and dark overnight.
    const hour = ts.getHours() + ts.getMinutes() / 60;
    const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));

    await sensorDataServices.createTelemetryIntoDB({
      ts,
      meta: { farmerId, fieldId, deviceId: "esp32-dev" },
      temperature: +(22 + daylight * 9 + (Math.random() - 0.5) * 0.8).toFixed(2),
      humidity: +(80 - daylight * 22 + (Math.random() - 0.5) * 3).toFixed(2),
      // Soil dries through the day, with a watering step each morning.
      soilMoisture: +(
        62 - ((i % 144) / 144) * 18 + (Math.random() - 0.5) * 1.5
      ).toFixed(2),
      lightIntensity: +(daylight * 18000 + Math.random() * 400).toFixed(2),
    });
    written++;
  }

  console.log(`seeded ${written} readings for ${fieldId} (${farmerId})`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("failed:", e?.message ?? e);
  process.exit(1);
});
