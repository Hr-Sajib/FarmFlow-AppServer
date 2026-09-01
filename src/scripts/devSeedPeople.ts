/**
 * `npm run seed:people` — development fixtures.
 *
 * Creates a test admin and a test expert so the verification and escalation
 * flows can be exercised end to end. Idempotent, and refuses to run outside
 * development so fixture accounts can never reach a real deployment.
 */
import mongoose from "mongoose";
import config from "../config";
import { UserModel } from "../app/modules/user/user.model";
import { generateUserCode } from "../app/utils/generateIds";

const FIXTURES = [
  {
    fullName: "Test Admin",
    email: "admin@farmflow.test",
    password: "farmflow123",
    address: "Dhaka",
    role: "admin" as const,
  },
  {
    fullName: "Dr Farida Rahman",
    email: "farida.expert@farmflow.test",
    password: "farmflow123",
    address: "Gazipur",
    role: "expert" as const,
    expertStatus: "pending" as const,
    designations: [
      {
        designationTitle: "Senior Plant Pathologist",
        designatedFrom: "Bangladesh Agricultural Research Institute",
        documents: [],
        isApproved: false,
      },
    ],
  },
];

const run = async () => {
  if (config.NODE_ENV === "production") {
    console.error("refusing to seed fixture accounts in production");
    process.exit(1);
  }

  await mongoose.connect(config.database_url as string);

  for (const fixture of FIXTURES) {
    const existing = await UserModel.findOne({ email: fixture.email });
    if (existing) {
      console.log(`  exists: ${fixture.email} (${existing.userCode})`);
      continue;
    }
    const created = await UserModel.create({
      ...fixture,
      userCode: await generateUserCode(fixture.role),
    });
    console.log(`  created: ${fixture.email} (${created.userCode})`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("failed:", e?.message ?? e);
  process.exit(1);
});
