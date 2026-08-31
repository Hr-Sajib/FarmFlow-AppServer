import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";

import { UserModel } from "../user/user.model";
import { PasswordResetModel } from "./passwordReset.model";
import AppError from "../../errors/AppError";
import { createToken, createResetToken, verifyToken } from "../../utils/auth.utils";
import { sendEmail, buildResetCodeEmail } from "../../utils/sendEmail";
import config from "../../../config";
import {
  TChangePassword,
  TLoginUser,
  TResetPassword,
  TVerifyResetCode,
} from "./auth.interface";

const MAX_CODE_ATTEMPTS = 5;

const issueTokens = (user: {
  _id: unknown;
  email: string;
  role: string;
}) => {
  const payload = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: createToken(
      payload,
      config.jwt_access_secret as string,
      config.jwt_access_expires_in as string
    ),
    refreshToken: createToken(
      payload,
      config.jwt_refresh_secret as string,
      config.jwt_refresh_expires_in as string
    ),
  };
};

const loginUserIntoDB = async (payload: TLoginUser) => {
  const { email, password } = payload;

  const user = await UserModel.findOne({ email, isDeleted: false }).select(
    "+password"
  );

  // Same error for "no such user" and "wrong password" so the endpoint cannot
  // be used to discover which email addresses are registered.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.status === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "You are blocked! Contact us.");
  }

  return issueTokens(user);
};

const refreshToken = async (token: string) => {
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  // Previously this queried `{ userPhone }` while the schema field was `phone`,
  // so the lookup never matched and refresh silently failed.
  const user = await UserModel.findById(decoded.userId);

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User no longer exists");
  }
  if (user.status === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "You are blocked! Contact us.");
  }

  const { accessToken } = issueTokens(user);
  return { accessToken };
};

/**
 * Stage 1. Always reports success, whether or not the address is registered —
 * a different response for unknown emails turns this into an account oracle.
 */
const forgotPassword = async (email: string) => {
  const genericResponse = {
    message: "If that email is registered, a reset code has been sent to it.",
  };

  const user = await UserModel.findOne({ email, isDeleted: false });
  if (!user || user.status === "blocked") return genericResponse;

  // Supersede any outstanding code so only the newest one works.
  await PasswordResetModel.deleteMany({ userId: user._id });

  const code = String(randomInt(10000, 100000));
  const ttlMinutes = config.reset_code_ttl_minutes;

  await PasswordResetModel.create({
    userId: user._id,
    // Hashed for the same reason passwords are: a database leak must not hand
    // over working reset codes.
    codeHash: await bcrypt.hash(code, Number(config.bcrypt_salt_rounds)),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });

  const mail = buildResetCodeEmail(code, ttlMinutes);
  await sendEmail({ to: user.email, ...mail });

  return genericResponse;
};

/** Stage 2. Exchanges a correct code for a short-lived, purpose-scoped token. */
const verifyResetCode = async ({ email, code }: TVerifyResetCode) => {
  const user = await UserModel.findOne({ email, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired code");
  }

  const record = await PasswordResetModel.findOne({ userId: user._id });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired code");
  }

  // Without a cap, five digits is only 90,000 guesses.
  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await PasswordResetModel.deleteOne({ _id: record._id });
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      "Too many incorrect attempts. Please request a new code."
    );
  }

  if (!(await bcrypt.compare(code, record.codeHash))) {
    await PasswordResetModel.updateOne(
      { _id: record._id },
      { $inc: { attempts: 1 } }
    );
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired code");
  }

  await PasswordResetModel.updateOne(
    { _id: record._id },
    { isVerified: true }
  );

  return {
    resetToken: createResetToken(
      String(user._id),
      config.jwt_reset_secret as string,
      `${config.reset_code_ttl_minutes}m`
    ),
  };
};

/** Stage 3. Consumes the stage-2 token and the reset record exactly once. */
const resetPassword = async ({ resetToken, newPassword }: TResetPassword) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      resetToken,
      config.jwt_reset_secret as string
    ) as JwtPayload;
  } catch {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Reset session expired. Start again."
    );
  }

  // An access token must not be usable here.
  if (decoded.purpose !== "password_reset") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid reset token");
  }

  const record = await PasswordResetModel.findOne({
    userId: decoded.userId,
    isVerified: true,
  });
  if (!record) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Reset session expired. Start again."
    );
  }

  const user = await UserModel.findById(decoded.userId);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  user.password = newPassword; // hashed by the pre-save hook
  user.passwordChangedAt = new Date(); // invalidates previously issued tokens
  await user.save();

  await PasswordResetModel.deleteMany({ userId: user._id });

  return { message: "Password reset successfully. Please log in." };
};

const changePassword = async (userId: string, payload: TChangePassword) => {
  const user = await UserModel.findById(userId).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!(await bcrypt.compare(payload.oldPassword, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password is incorrect");
  }

  user.password = payload.newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  return { message: "Password changed successfully. Please log in again." };
};

/** Admin override, bypassing the code flow entirely. */
const adminResetPassword = async (userId: string, newPassword: string) => {
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  await PasswordResetModel.deleteMany({ userId: user._id });

  return { message: `Password reset for ${user.email}` };
};

export const authServices = {
  loginUserIntoDB,
  refreshToken,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  adminResetPassword,
};
