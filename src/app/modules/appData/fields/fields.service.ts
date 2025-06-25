
import { UserModel } from "../user/user.model";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IField } from "./fields.interface";
import { FieldModel } from "./fields.model";
import { generateFieldId } from "../../../utils/generateIds";


const addField = async (fieldData: IField, userPhone: string) => {

  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  fieldData.fieldId = await generateFieldId()

  if (fieldData.farmerId !== user.farmerId) {
    const farmer = await UserModel.findOne({ phone: userPhone, isDeleted: false });
    if (!farmer) {
      throw new AppError(httpStatus.NOT_FOUND, "Farmer not found!");
    }
  }

  // Check if fieldId is unique
  const existingField = await FieldModel.findOne({ fieldId: fieldData.fieldId });
  if (existingField) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID already exists!");
  }

  const newField = await FieldModel.create(fieldData);
  return newField;
};

// Soft delete a field
const removeField = async (fieldId: string, userPhone: string, role: string) => {
  // Verify the user exists and is not deleted
  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Find the field
  const field = await FieldModel.findOne({ fieldId });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  // Check if the user is authorized (admin or the field's farmer)
  if (role !== "admin" && field.farmerId !== user._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own fields!");
  }

  // Perform soft delete
  const updatedField = await FieldModel.findOneAndUpdate(
    { fieldId },
    { isDeleted: true },
    { new: true }
  );

  if (!updatedField) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
  }

  return updatedField;
};

// Update a field
const updateField = async (fieldId: string, fieldData: Partial<IField>, userPhone: string, role: string) => {
  // Verify the user exists and is not deleted
  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Find the field
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  // Check if the user is authorized (admin or the field's farmer)
  if (role !== "admin" && field.farmerId !== user._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only update your own fields!");
  }

  // Prevent updating fieldId
  if (fieldData.fieldId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID cannot be updated!");
  }

  // If updating farmerId, verify the new farmer exists
  if (fieldData.farmerId) {
    const newFarmer = await UserModel.findOne({ _id: fieldData.farmerId, isDeleted: false });
    if (!newFarmer) {
      throw new AppError(httpStatus.NOT_FOUND, "New farmer not found!");
    }
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
  const fields = await FieldModel.find({ isDeleted: false })
    .populate("farmerId", "name phone role");
  return fields;
};

// Read a specific field by fieldId
const readFieldById = async (fieldId: string) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false })
    .populate("farmerId", "name phone role");
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
};