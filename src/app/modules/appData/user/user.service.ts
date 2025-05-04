import AppError from "../../../errors/AppError";
import { IUser, TFieldData } from "./user.interface";
import { UserModel } from "./user.model";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { generateFarmerId } from "../../../utils/generateFarmerId";

const createUserIntoDB = async (payload: IUser) => {
  const farmerId = await generateFarmerId();
  const totalFieldsCount = payload.fieldDetails? payload.fieldDetails.length : 0;

  const insertingData = {...payload, farmerId:farmerId, totalFieldsCount: totalFieldsCount}

  const newUser = await UserModel.create(insertingData);
  if (!newUser) {
    throw new AppError(400, "ইউজার সফলভাবে তৈরি হয়নি! ");
  }
  return newUser;
};








const toggleUserStatus = async (userId: string) => {
  generateFarmerId();
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found!");
  }

  const newStatus = user.status === "active" ? "blocked" : "active";
  user.status = newStatus;
  await user.save();

  return user;
};

const updateUserData = async (userId: string, userPhone: string, updates: Partial<IUser>) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "Target user not found");
  }

  // Compare the phone numbers
  if (userData.phone !== userPhone) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Param ID and login access token do not match");
  }

  // Update scalar fields
  if (updates.name) userData.name = updates.name;
  if (updates.email) userData.email = updates.email;

  // Update fieldDetails array (append or update specific elements)
  if (updates.fieldDetails) {
    updates.fieldDetails.forEach((newField: TFieldData) => {
      const existingIndex = userData.fieldDetails.findIndex(
        (field) => field.fieldId === newField.fieldId
      );
      if (existingIndex !== -1) {
        userData.fieldDetails[existingIndex] = newField;
      } else {
        userData.fieldDetails.push(newField);
      }
    });
    userData.totalFieldsCount = userData.fieldDetails.length;
  }

  await userData.save();
  return userData;
};

const deleteFieldFromUserData = async (userId: string, userPhone: string, fieldId: string) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "Target user not found");
  }

  // Compare the phone numbers
  if (userData.phone !== userPhone) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Param ID and login access token do not match");
  }

  const initialLength = userData.fieldDetails.length;
  userData.fieldDetails = userData.fieldDetails.filter((field: TFieldData) => field.fieldId !== fieldId);

  if (userData.fieldDetails.length === initialLength) {
    throw new AppError(404, "Field not found in fieldDetails");
  }

  userData.totalFieldsCount = userData.fieldDetails.length;
  await userData.save();
  return userData;
};

const addFieldToUserData = async (userId: string, userPhone: string, fieldData: TFieldData) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "Target user not found");
  }

  // Compare the phone numbers
  if (userData.phone !== userPhone) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Param ID and login access token do not match");
  }

  // Append the new fieldData to fieldDetails array
  userData.fieldDetails.push(fieldData);
  userData.totalFieldsCount = userData.fieldDetails.length;

  await userData.save();
  return userData;
};



const updateUserPassword = async (
  userId: string,
  userPhone: string,
  role: string,
  oldPassword: string | undefined,
  newPassword: string
) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "Target user not found");
  }

  // Compare the phone numbers


  // Skip old password check & phone check if role is admin
  if (role !== "admin") {
    if (userData.phone !== userPhone) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Param ID and login access token do not match");
    }

    if (!oldPassword) {
      throw new AppError(400, "Old password is required");
    }
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, userData.password);
    if (!isOldPasswordCorrect) {
      throw new AppError(401, "আগের পাসওয়ার্ড সঠিক হয়নি!");
    }
  }

  // Set the new password
  userData.password = newPassword;
  userData.passwordChangedAt = new Date();
  await userData.save();

  return { message: "Password updated successfully" };
};

const updateFieldData = async (
  userId: string,
  fieldId: string,
  userPhone: string,
  role: string,
  fieldData: TFieldData
) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "Target user not found");
  }

  // Skip phone check if role is admin
  if (role !== "admin") {
    if (userData.phone !== userPhone) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Param ID and login access token do not match");
    }
  }

  // Find the field to update
  const fieldIndex = userData.fieldDetails.findIndex((field: TFieldData) => field.fieldId === fieldId);
  if (fieldIndex === -1) {
    throw new AppError(404, "Field not found in fieldDetails");
  }

  // Exclude fieldId from the incoming fieldData to prevent updating it
  const { fieldId: _, ...updatableFieldData } = fieldData;

  // Update the field data, preserving the original fieldId
  userData.fieldDetails[fieldIndex] = { ...userData.fieldDetails[fieldIndex], ...updatableFieldData };
  userData.totalFieldsCount = userData.fieldDetails.length;

  await userData.save();
  return userData;
};

export const userServices = {
  createUserIntoDB,
  toggleUserStatus,
  deleteFieldFromUserData,
  addFieldToUserData,
  updateUserData,
  updateUserPassword,
  updateFieldData
};