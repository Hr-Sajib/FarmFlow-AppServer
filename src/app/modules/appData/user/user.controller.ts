import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import { IUser } from "./user.interface";
import httpStatus from "http-status";
import sendResponse from "../../../utils/sendResponse";
import { userServices } from "./user.service";
import { UserValidation } from "./user.validation";
import AppError from "../../../errors/AppError";

// Create a new user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body;

  const newUser = await userServices.createUserIntoDB(userData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Users fetched successfully",
    data: newUser,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const Users = await userServices.getAllUsersFromDB();

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "All Users fetched successfully",
    data: Users,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = await userServices.getUserByIdFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {

  const user = await userServices.getMeFromDB(req.user?.userPhone);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

// Toggle user status between active and blocked
const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const updatedUser = await userServices.toggleUserStatus(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status updated to ${updatedUser.status}`,
    data: updatedUser,
  });
});

// Update user data
const updateUser = catchAsync(async (req: Request, res: Response) => {
  console.log("ctrl touch")
  const { userId } = req.params;
  const updates = req.body;
  const userPhone = req.user.userPhone; // Set by auth middleware
  const role = req.user.role; // Set by auth middleware

  const updatedUser = await userServices.updateUserData(role, userId, userPhone, updates);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User data updated successfully",
    data: updatedUser,
  });
});

// Update user password
const updatePassword = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { oldPassword, newPassword } = req.body;
  const userPhone = req.user.userPhone; // Set by auth middleware
  const role = req.user.role; // Set by auth middleware

  if (!newPassword) {
    throw new AppError(400, "New password is required");
  }

  const updatedUser = await userServices.updateUserPassword(userId, userPhone, role, oldPassword, newPassword);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password updated successfully",
    data: updatedUser,
  });
});

const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const deletedUser = await userServices.softDeleteUserInDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: deletedUser,
  });
});

export const userController = {
  createUser,
  toggleUserStatus,
  updateUser,
  updatePassword,
  softDeleteUser,
  getAllUsers,
  getUserById,
  getMe
};