import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { fieldServices, TActor } from "./fields.service";

/** Every handler resolves the caller from the verified token, never the body. */
const actorOf = (req: Request): TActor => ({
  userId: req.user.userId,
  role: req.user.role,
  userCode: req.user.userCode,
});

const addField = catchAsync(async (req: Request, res: Response) => {
  const newField = await fieldServices.addField(req.body, actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Field created successfully",
    data: newField,
  });
});

const removeField = catchAsync(async (req: Request, res: Response) => {
  const deletedField = await fieldServices.removeField(
    req.params.fieldId,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field deleted successfully",
    data: deletedField,
  });
});

const updateField = catchAsync(async (req: Request, res: Response) => {
  const updatedField = await fieldServices.updateField(
    req.params.fieldId,
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field updated successfully",
    data: updatedField,
  });
});

const readAllFields = catchAsync(async (req: Request, res: Response) => {
  const { farmerId } = req.query as { farmerId?: string };
  const fields = await fieldServices.readAllFields({ farmerId });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Fields retrieved successfully",
    data: fields,
  });
});

const readMyFields = catchAsync(async (req: Request, res: Response) => {
  const fields = await fieldServices.readMyFieldsFromDB(actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your fields retrieved successfully",
    data: fields,
  });
});

const readFieldById = catchAsync(async (req: Request, res: Response) => {
  const field = await fieldServices.readFieldById(
    req.params.fieldId,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field retrieved successfully",
    data: field,
  });
});

const getFieldInsights = catchAsync(async (req: Request, res: Response) => {
  // Ownership is checked before spending an LLM call on someone else's field.
  await fieldServices.readFieldById(req.params.fieldId, actorOf(req));
  const insights = await fieldServices.loadInsightsFromFieldData(req.body.data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field insights generated successfully",
    data: { insights },
  });
});

const getFieldLongInsights = catchAsync(async (req: Request, res: Response) => {
  await fieldServices.readFieldById(req.params.fieldId, actorOf(req));
  const insights = await fieldServices.loadLongInsightsFromFieldData(req.body.data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field long insights generated successfully",
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
  getFieldLongInsights,
};
