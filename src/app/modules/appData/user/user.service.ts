import AppError from "../../../errors/AppError";
import { IUser } from "./user.interface";
import { UserModel } from "./user.model";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { generateFarmerId } from "../../../utils/generateFarmerId";
import config from "../../../../config";

// Create a new user in the database
const createUserIntoDB = async (payload: IUser) => {
  const farmerId = await generateFarmerId();
  const insertingData = { ...payload, farmerId };

  const newUser = await UserModel.create(insertingData);
  if (!newUser) {
    throw new AppError(400, "Failed to create user!");
  }
  return newUser;
};

const getAllUsersFromDB = async () => {

  const allUsers = await UserModel.find();
  if (!allUsers) {
    throw new AppError(400, "Failed to fetch users!");
  }
  return allUsers;
};

const getUserByIdFromDB = async (userId: string) => {

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(400, "Failed to fetch user!");
  }
  return user;
};

// Toggle user status between active and blocked
const toggleUserStatus = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found!");
  }

  const newStatus = user.status === "active" ? "blocked" : "active";
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { status: newStatus } },
    { new: true }
  );
  if (!updatedUser) {
    throw new AppError(500, "Failed to update user status!");
  }

  return updatedUser;
};

// Update user data
const updateUserData = async (role:string,userId: string, userPhone: string, updates: Partial<IUser>) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId);
  if (!userData) {
    throw new AppError(404, "User not found!");
  }

  if(role !== "admin" && userData.phone !== userPhone){
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Parameter ID and login access token do not match!");
  }



  // Prepare update object for $set
  const updateFields: Partial<IUser> = {};
  if (updates.name) updateFields.name = updates.name;
  if (updates.email) updateFields.email = updates.email;
  if (updates.address) updateFields.address = updates.address;

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true }
  );
  if (!updatedUser) {
    throw new AppError(500, "Failed to update user data!");
  }

  return updatedUser;
};

// Update user password
const updateUserPassword = async (
  userId: string,
  userPhone: string,
  role: string,
  oldPassword: string | undefined,
  newPassword: string
) => {
  // Find the target user by userId
  const userData = await UserModel.findById(userId).select("+password");
  if (!userData) {
    throw new AppError(404, "User not found!");
  }

  // Skip old password check and phone check if role is admin
  if (role !== "admin") {
    if (userData.phone !== userPhone) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: Parameter ID and login access token do not match!");
    }

    if (!oldPassword) {
      throw new AppError(400, "Old password is required!");
    }
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, userData.password);
    if (!isOldPasswordCorrect) {
      throw new AppError(401, "Old password is incorrect!");
    }
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  // Update password and passwordChangedAt using $set
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { password: hashedPassword, passwordChangedAt: new Date() } },
    { new: true, select: "-password" }
  );
  if (!updatedUser) {
    throw new AppError(500, "Failed to update password!");
  }

  return updatedUser;
};


const softDeleteUserInDB = async (userId: string) => {
  const user = await UserModel.findById(userId).where({ isDeleted: false });
  if (!user) {
    throw new AppError(404, "User not found!");
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { isDeleted: true } },
    { new: true }
  );
  if (!updatedUser) {
    throw new AppError(500, "Failed to delete user!");
  }

  return updatedUser;
};

export const userServices = {
  createUserIntoDB,
  toggleUserStatus,
  updateUserData,
  updateUserPassword,
  softDeleteUserInDB,
  getAllUsersFromDB,
  getUserByIdFromDB
};