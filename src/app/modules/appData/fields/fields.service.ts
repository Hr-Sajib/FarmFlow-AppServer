import { UserModel } from "../user/user.model";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IField } from "./fields.interface";
import { generateFieldId } from "../../../utils/generateIds";
import { FieldModel } from "./fields.model";
import { ClientSession } from "mongoose";



const addField = async (fieldData: IField, userPhone: string, role: string) => {

  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Generate unique fieldId and pull farmerId
  fieldData.farmerId = user.farmerId;
  fieldData.fieldId = await generateFieldId();


  const existingField = await FieldModel.findOne({ fieldId: fieldData.fieldId });
  if (existingField) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID already exists!");
  }

  // Start a transaction
  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    // Create the new field
    const newField = await FieldModel.create([fieldData], { session });
    if (!newField[0]) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create field!");
    }

    // Update the user's fieldIds array with the new field's _id
    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: newField[0]._id } },
      { new: true, session }
    );

    if (role !== "admin" && fieldData.farmerId !== user.farmerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only add to your own fields!");
  }
    if (!updatedUser) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
    }

    // Commit the transaction
    await session.commitTransaction();
    return newField[0];
  } catch (error) {
    // Rollback the transaction
    await session.abortTransaction();
    throw error instanceof AppError ? error : new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add field!");
  } finally {
    session.endSession();
  }
};

// Soft delete a field with transaction
const removeField = async (fieldId: string, userPhone: string, role: string) => {
  // Verify the user exists and is not deleted
  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Find the field
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  // Check if the user is authorized (admin or the field's farmer)
  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own fields!");
  }

  // Start a transaction
  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    // Perform soft delete
    const updatedField = await FieldModel.findOneAndUpdate(
      { fieldId, isDeleted: false },
      { isDeleted: true },
      { new: true, session }
    );

    if (!updatedField) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
    }

    // Remove the field's _id from the user's fieldIds
    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: field.farmerId, isDeleted: false },
      { $pull: { fieldIds: field._id } },
      { new: true, session }
    );

    if (!updatedUser) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
    }

    // Commit the transaction
    await session.commitTransaction();
    return updatedField;
  } catch (error) {
    // Rollback the transaction
    await session.abortTransaction();
    throw error instanceof AppError ? error : new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
  } finally {
    session.endSession();
  }
};

// Update a field
const updateField = async (fieldId: string, fieldData: Partial<IField>, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  console.log("Field id searching: ",fieldData.fieldId)
  const field = await FieldModel.findOne({ fieldId: fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only update your own fields!");
  }

  if (fieldData.fieldId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID cannot be updated!");
  }

  if (fieldData.farmerId) {
    const newFarmer = await UserModel.findOne({ farmerId: fieldData.farmerId, isDeleted: false });
    if (!newFarmer) {
      throw new AppError(httpStatus.NOT_FOUND, "New farmer not found!");
    }

    // Update the new user's fieldIds
    await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: field._id } },
      { new: true }
    );

    // Remove fieldId from the previous user's fieldIds
    await UserModel.findOneAndUpdate(
      { farmerId: field.farmerId, isDeleted: false },
      { $pull: { fieldIds: field._id } },
      { new: true }
    );
  }

  const updatedField = await FieldModel.findOneAndUpdate(
    { fieldId, isDeleted: false },
    { $set: fieldData },
    { new: true }
  );

  if (!updatedField) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update field!");
  }

  return updatedField;
};

// Read all fields
const readAllFields = async () => {
  const fields = await FieldModel.find({ isDeleted: false });
  return fields;
};

const readMyFieldsFromDB = async (userPhone: string) => {

  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const targetFarmerId = user.farmerId;

  const fields = await FieldModel.find({ farmerId: targetFarmerId });
  return fields;
};

// Read a specific field by fieldId
const readFieldById = async (fieldId: string) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }
  return field;
};

export const fieldServices = {
  addField,
  removeField,
  updateField,
  readAllFields,
  readFieldById,
  readMyFieldsFromDB
};