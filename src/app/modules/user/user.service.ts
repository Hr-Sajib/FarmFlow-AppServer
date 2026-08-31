import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { IUser, TUserRole } from "./user.interface";
import { UserModel } from "./user.model";
import { generateUserCode } from "../../utils/generateIds";

const createUserIntoDB = async (payload: IUser) => {
  const existing = await UserModel.findOne({ email: payload.email });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with that email already exists"
    );
  }

  const role: TUserRole = payload.role ?? "farmer";

  const newUser = await UserModel.create({
    ...payload,
    role,
    userCode: await generateUserCode(role),
    // Experts start unverified; an admin promotes them after reviewing
    // the designations they submitted.
    ...(role === "expert" ? { expertStatus: "pending" as const } : {}),
  });

  return newUser;
};

const getAllUsersFromDB = async (filters: { role?: string; status?: string }) => {
  const query: Record<string, unknown> = { isDeleted: false };
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;

  return UserModel.find(query).sort({ createdAt: -1 });
};

const getUserByIdFromDB = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/** `getMe` resolves the caller from the token id — never from a URL parameter. */
const getMeFromDB = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * `updates` has already been narrowed to the caller's allowed fields by the
 * controller, so this layer can apply it directly.
 */
const updateUserData = async (userId: string, updates: Partial<IUser>) => {
  const user = await UserModel.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (updates.email && updates.email !== user.email) {
    const taken = await UserModel.findOne({
      email: updates.email,
      _id: { $ne: userId },
    });
    if (taken) {
      throw new AppError(httpStatus.CONFLICT, "That email is already in use");
    }
  }

  // A role change also changes the code prefix, which encodes the role.
  if (updates.role && updates.role !== user.role) {
    updates.userCode = await generateUserCode(updates.role);
    if (updates.role === "expert" && !user.expertStatus) {
      updates.expertStatus = "pending";
    }
  }

  const updated = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user");
  }
  return updated;
};

/** Soft delete — the record is retained so posts and sessions keep resolving. */
const softDeleteUserInDB = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user.role === "admin") {
    throw new AppError(httpStatus.FORBIDDEN, "Admin accounts cannot be deleted");
  }

  return UserModel.findByIdAndUpdate(
    userId,
    { isDeleted: true, status: "blocked" },
    { new: true }
  );
};

export const userServices = {
  createUserIntoDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  getMeFromDB,
  updateUserData,
  softDeleteUserInDB,
};
