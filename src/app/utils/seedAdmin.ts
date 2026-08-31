import config from "../../config";
import { UserModel } from "../modules/user/user.model";
import { generateUserCode } from "./generateIds";

/**
 * Registration only accepts farmer and expert, so the first admin cannot come
 * from the public API. This creates one from environment variables on boot.
 *
 * Idempotent: it exits if any admin already exists, and it never updates an
 * existing account — so rotating the seed password requires the reset flow,
 * not a restart.
 */
export const seedAdmin = async (): Promise<void> => {
  const email = config.admin_email;
  const password = config.admin_password;

  if (!email || !password) {
    console.warn(
      "[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed"
    );
    return;
  }

  const existingAdmin = await UserModel.findOne({ role: "admin", isDeleted: false });
  if (existingAdmin) return;

  await UserModel.create({
    fullName: config.admin_name,
    email,
    password, // hashed by the pre-save hook
    address: "—",
    role: "admin",
    status: "active",
    userCode: await generateUserCode("admin"),
  });

  console.info(`[seed] Admin account created for ${email}`);
};
