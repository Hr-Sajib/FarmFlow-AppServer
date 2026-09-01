/**
 * `npm run link:device -- <deviceId> [fieldId]` — points a physical node at a field.
 *
 * The ESP32 firmware is frozen and identifies itself with hardware labels
 * ("fd1"), not with the generated field id. This records which field that
 * device reports for, which is what the MQTT subscriber resolves through.
 * Without it, readings from real hardware are dropped as unclaimed.
 */
import mongoose from "mongoose";

import config from "../config";
import { FieldModel } from "../app/modules/fields/fields.model";

const run = async () => {
  const [deviceId, fieldId] = process.argv.slice(2);

  if (!deviceId) {
    console.error("usage: npm run link:device -- <deviceId> [fieldId]");
    process.exit(1);
  }

  await mongoose.connect(config.database_url as string);

  // Without a field id, attach to the only field there is — unambiguous in a
  // single-field deployment and an error in any other.
  const field = fieldId
    ? await FieldModel.findOne({ fieldId, isDeleted: false })
    : await FieldModel.findOne({ isDeleted: false });

  if (!field) {
    console.error(fieldId ? `no field ${fieldId}` : "no fields exist");
    process.exit(1);
  }

  field.deviceId = deviceId;
  await field.save();
  console.log(`  ${deviceId} -> ${field.fieldId} (${field.fieldName})`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("failed:", e?.message ?? e);
  process.exit(1);
});
