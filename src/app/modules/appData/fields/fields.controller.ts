import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { FieldValidation } from "./fields.validation";
import { fieldServices } from "./fields.service";

// Add a new field
const addField = catchAsync(async (req: Request, res: Response) => {
  // Validate request body using Zod schema
  const fieldData = req.body;
  const userPhone = req.user.userPhone;

  const newField = await fieldServices.addField(fieldData, userPhone, req?.user?.role);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Field created successfully",
    data: newField,
  });
});

// Soft delete a field
const removeField = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const deletedField = await fieldServices.removeField(fieldId, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field deleted successfully",
    data: deletedField,
  });
});

// Update a field
const updateField = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  const fieldData = req.body;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedField = await fieldServices.updateField(fieldId, fieldData, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field updated successfully",
    data: updatedField,
  });
});

// Read all fields
const readAllFields = catchAsync(async (req: Request, res: Response) => {
  const fields = await fieldServices.readAllFields();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Fields retrieved successfully",
    data: fields,
  });
});

// Read all fields
const readMyFields = catchAsync(async (req: Request, res: Response) => {
  const fields = await fieldServices.readMyFieldsFromDB(req.user?.userPhone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Fields retrieved successfully",
    data: fields,
  });
});

// Read a specific field by fieldId
const readFieldById = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;

  const field = await fieldServices.readFieldById(fieldId);
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field retrieved successfully",
    data: field,
  });
});


const getFieldInsights = catchAsync(async (req: Request, res: Response) => {
  const fieldInfo = req?.body?.data;

    const insights = await fieldServices.loadInsightsFromFieldData(fieldInfo);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Field insights generated successfully',
      data: { insights },
    });
});

const getFieldLongInsights = catchAsync(async (req: Request, res: Response) => {
  const fieldInfo = req?.body?.data;

    const insights = await fieldServices.loadLongInsightsFromFieldData(fieldInfo);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Field long insights generated successfully',
      data: { insights },
    });
});


export const fieldController = {
  addField,
  removeField,
  updateField,
  readAllFields,
  readFieldById,
  readMyFields,
  getFieldInsights,
  getFieldLongInsights
};