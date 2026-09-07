/**
 * `npm run backfill:soil` — fetches and stores a SoilGrids profile for every
 * field that doesn't have one yet.
 *
 * `soilProfile` is only computed when a field is created or its location is
 * updated (see fields.service.ts). Fields created before that existed, or
 * seeded directly into the database, never triggered that fetch — this is
 * the one-time catch-up for those.
 */
import mongoose from "mongoose";

import config from "../config";
import { FieldModel } from "../app/modules/fields/fields.model";
import { fetchSoilProfileForField } from "../app/modules/fields/fields.utils";

const run = async () => {
  await mongoose.connect(config.database_url as string);

  const fields = await FieldModel.find({
    isDeleted: false,
    soilProfile: { $in: [null, undefined] },
  });

  if (!fields.length) {
    console.log("Every field already has a soil profile.");
  }

  for (const field of fields) {
    const profile = await fetchSoilProfileForField(field.fieldLocation);
    field.soilProfile = profile;
    await field.save();
    console.log(
      profile
        ? `${field.fieldId} (${field.fieldName}): pH ${profile.ph.toFixed(1)}, clay ${profile.clay.toFixed(0)}%`
        : `${field.fieldId} (${field.fieldName}): no SoilGrids coverage at these coordinates`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("failed:", e?.message ?? e);
  process.exit(1);
});
