/**
 * Standalone seed entrypoint: `npm run seed`.
 *
 * Connects, seeds, disconnects — no HTTP server, no MQTT, no InfluxDB. Safe to
 * run repeatedly; seedAdmin exits early if an admin already exists.
 */
import mongoose from "mongoose";
import config from "../config";
import { seedAdmin } from "../app/utils/seedAdmin";

const run = async () => {
  try {
    await mongoose.connect(config.database_url as string);
    console.info("[seed] connected to MongoDB");

    await seedAdmin();

    console.info("[seed] done");
    process.exitCode = 0;
  } catch (error) {
    console.error(
      "[seed] failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
