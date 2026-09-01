import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import { userServices } from "./user.service";
import { UPDATABLE_FIELDS } from "./user.validation";
import { IUser, TUserRole } from "./user.interface";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userServices.createUserIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration successful",
    data: user,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { role, status } = req.query as { role?: string; status?: string };
  const users = await userServices.getAllUsersFromDB({ role, status });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: users,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await userServices.getUserByIdFromDB(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

const getVerifiedExperts = catchAsync(async (_req: Request, res: Response) => {
  const experts = await userServices.getVerifiedExpertsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verified experts retrieved successfully",
    data: experts,
  });
});

/** Identity comes from the verified token, so there is nothing to spoof. */
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await userServices.getMeFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: user,
  });
});

/**
 * Ownership and field narrowing both happen here:
 *  - an admin may update anyone; a farmer or expert only themselves
 *  - the body is filtered to the fields that role is allowed to set, so
 *    `role`, `status` and `expertStatus` are dropped for non-admins rather
 *    than trusted from the request
 */
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const callerRole = req.user.role as TUserRole;
  const callerId = req.user.userId;

  if (callerRole !== "admin" && userId !== callerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update your own profile"
    );
  }

  const allowed = UPDATABLE_FIELDS[callerRole] ?? UPDATABLE_FIELDS.farmer;
  const updates: Partial<IUser> = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (updates as Record<string, unknown>)[key] = req.body[key];
    }
  }

  const rejected = Object.keys(req.body).filter(
    (key) => !(allowed as readonly string[]).includes(key)
  );
  if (rejected.length) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not allowed to update: ${rejected.join(", ")}`
    );
  }

  const user = await userServices.updateUserData(userId, updates);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userServices.softDeleteUserInDB(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: user,
  });
});

export const userController = {
  createUser,
  getAllUsers,
  getUserById,
  getVerifiedExperts,
  getMe,
  updateUser,
  softDeleteUser,
};
