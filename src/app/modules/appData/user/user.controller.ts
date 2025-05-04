import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import { IUser } from "./user.interface";
import httpStatus from 'http-status';
import sendResponse from "../../../utils/sendResponse";
import { userServices } from "./user.service";
import AppError from "../../../errors/AppError";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body as IUser;
  const newUser = await userServices.createUserIntoDB(userData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "ইউজার সফলভাবে তৈরি হয়েছে",
    data: newUser,
  });
});

const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
  console.log("hit ctrl ");
  const { userId } = req.params;

  const updatedUser = await userServices.toggleUserStatus(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status updated to ${updatedUser.status}`,
    data: updatedUser,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, email, fieldDetails } = req.body;
  const userPhone = req.user.userPhone; // Set by auth middleware

  const updates: Partial<IUser> = { name, email, fieldDetails };
  const updatedUser = await userServices.updateUserData(userId, userPhone, updates);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User data updated successfully",
    data: updatedUser,
  });
});

const deleteFieldFromUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { fieldId } = req.body;
  if (!fieldId) {
    throw new AppError(400, "fieldId is required");
  }

  const userPhone = req.user.userPhone; // Set by auth middleware
  const updatedUser = await userServices.deleteFieldFromUserData(userId, userPhone, fieldId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field deleted successfully from user data",
    data: updatedUser,
  });
});

const addFieldToUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { fieldData } = req.body;
  if (!fieldData) {
    throw new AppError(400, "No field data provided");
  }

  const userPhone = req.user.userPhone; // Set by auth middleware
  const updatedUser = await userServices.addFieldToUserData(userId, userPhone, fieldData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field added successfully to user data",
    data: updatedUser,
  });
});


const updatePassword = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { oldPassword, newPassword } = req.body;
  const userPhone = req.user.userPhone; // Set by auth middleware

  if (!newPassword) {
    throw new AppError(400, "New password is required");
  }

  const result = await userServices.updateUserPassword(userId, userPhone, req.user.role, oldPassword, newPassword);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});


const updateField = catchAsync(async (req: Request, res: Response) => {
  console.log("controller reached...")
  const { userId, fieldId } = req.params;
  const { fieldData } = req.body;
  const userPhone = req.user.userPhone; // Set by auth middleware
  const role = req.user.role; // Set by auth middleware

  if (!fieldData) {
    throw new AppError(400, "Field data is required");
  }

  const updatedUser = await userServices.updateFieldData(userId, fieldId, userPhone, role, fieldData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field updated successfully",
    data: updatedUser,
  });
});

export const userController = {
  createUser,
  toggleUserStatus,
  updatePassword,
  deleteFieldFromUser,
  addFieldToUser,
  updateUser,
  updateField
};