/**
 * `npm run seed:demo` — designates the accounts /auth/demo-login can reach.
 *
 * Unlike the other seed scripts this one is meant to run against the deployed
 * database too: the demo sign-in buttons are the point of the deployment, and
 * they resolve accounts by the `isDemo` flag this script sets.
 *
 * It never creates a farmer. The demo farmer has to be an account that already
 * owns fields and telemetry, or the recruiter lands on an empty dashboard —
 * so the farmer is picked as the existing account with the most fields.
 */
import mongoose from "mongoose";

import config from "../config";
import { UserModel } from "../app/modules/user/user.model";
import { FieldModel } from "../app/modules/fields/fields.model";
import { generateUserCode } from "../app/utils/generateIds";

/** Created if absent — neither role needs pre-existing data to be worth seeing. */
const CREATABLE = [
  {
    fullName: "Demo Admin",
    email: "demo.admin@farmflow.app",
    password: "demo-account-no-login",
    address: "Dhaka",
    role: "admin" as const,
  },
  {
    fullName: "Dr Farida Rahman",
    email: "demo.expert@farmflow.app",
    password: "demo-account-no-login",
    address: "Gazipur",
    role: "expert" as const,
    expertStatus: "verified" as const,
  },
];

/** The farmer with the most fields — the one whose dashboard has something in it. */
const pickDemoFarmer = async () => {
  const [top] = await FieldModel.aggregate<{ _id: string; fields: number }>([
    { $match: { isDeleted: false } },
    { $group: { _id: "$farmerId", fields: { $sum: 1 } } },
    { $sort: { fields: -1 } },
    { $limit: 1 },
  ]);

  if (!top) return null;
  return UserModel.findOne({ userCode: top._id, role: "farmer", isDeleted: false });
};

const run = async () => {
  await mongoose.connect(config.database_url as string);

  // Only ever one demo account per role, so a re-run cannot leave two behind
  // and have the endpoint pick arbitrarily between them.
  await UserModel.updateMany({ isDemo: true }, { $set: { isDemo: false } });

  for (const fixture of CREATABLE) {
    const existing = await UserModel.findOne({ email: fixture.email });
    if (existing) {
      existing.isDemo = true;
      existing.status = "active";
      await existing.save();
      console.log(`  marked: ${fixture.email} (${existing.userCode})`);
      continue;
    }
    const created = await UserModel.create({
      ...fixture,
      isDemo: true,
      userCode: await generateUserCode(fixture.role),
    });
    console.log(`  created: ${fixture.email} (${created.userCode})`);
  }

  const farmer = await pickDemoFarmer();
  if (farmer) {
    farmer.isDemo = true;
    await farmer.save();
    console.log(`  marked farmer: ${farmer.email} (${farmer.userCode})`);
  } else {
    console.warn(
      "  no farmer owns any field — the demo farmer button will return 404 until one does"
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("failed:", e?.message ?? e);
  process.exit(1);
});
