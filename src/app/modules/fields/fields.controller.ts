import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { fieldServices } from "./fields.service";
import { TActor } from "./fields.utils";

/** Every handler resolves the caller from the verified token, never the body. */
const actorOf = (req: Request): TActor => ({
  userId: req.user.userId,
  role: req.user.role,
  userCode: req.user.userCode,
});

const createField = catchAsync(async (req: Request, res: Response) => {
  const newField = await fieldServices.createFieldIntoDB(req.body, actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Field created successfully",
    data: newField,
  });
});

const getAllFields = catchAsync(async (req: Request, res: Response) => {
  const { farmerId } = req.query as { farmerId?: string };
  const fields = await fieldServices.getAllFieldsFromDB({ farmerId });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Fields retrieved successfully",
    data: fields,
  });
});

const getMyFields = catchAsync(async (req: Request, res: Response) => {
  const fields = await fieldServices.getMyFieldsFromDB(actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your fields retrieved successfully",
    data: fields,
  });
});

const getFieldById = catchAsync(async (req: Request, res: Response) => {
  const field = await fieldServices.getFieldByIdFromDB(
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

const updateField = catchAsync(async (req: Request, res: Response) => {
  const updatedField = await fieldServices.updateFieldData(
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

const softDeleteField = catchAsync(async (req: Request, res: Response) => {
  const deletedField = await fieldServices.softDeleteFieldInDB(
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

const getFieldWeather = catchAsync(async (req: Request, res: Response) => {
  const weather = await fieldServices.getFieldWeather(
    req.params.fieldId,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Weather retrieved successfully",
    data: weather,
  });
});

/* ---------------------------------------------------------------------------
 * DISABLED: AI insight handlers. Re-enable alongside fieldServices'
 * loadInsightsFromFieldData / loadLongInsightsFromFieldData and their routes.
 * -------------------------------------------------------------------------*/
// const getFieldInsights = catchAsync(async (req: Request, res: Response) => {
//   await fieldServices.getFieldByIdFromDB(req.params.fieldId, actorOf(req));
//   const insights = await fieldServices.loadInsightsFromFieldData(req.body.data);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Field insights generated successfully",
//     data: { insights },
//   });
// });

// const getFieldLongInsights = catchAsync(async (req: Request, res: Response) => {
//   await fieldServices.getFieldByIdFromDB(req.params.fieldId, actorOf(req));
//   const insights = await fieldServices.loadLongInsightsFromFieldData(req.body.data);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Field long insights generated successfully",
//     data: { insights },
//   });
// });

export const fieldController = {
  createField,
  getAllFields,
  getMyFields,
  getFieldById,
  updateField,
  softDeleteField,
  getFieldWeather,
};
