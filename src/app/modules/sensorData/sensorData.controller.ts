import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { sensorDataServices } from "./sensorData.service";
import { sensorDataValidations } from "./sensorData.validation";
import { TActor, assertCanReadField, toTelemetry } from "./sensorData.utils";

const actorOf = (req: Request): TActor => ({
  userId: req.user.userId,
  role: req.user.role,
  userCode: req.user.userCode,
});

const parseRange = (req: Request) =>
  sensorDataValidations.rangeQuerySchema.parse(req.query.range);

const createTelemetry = catchAsync(async (req: Request, res: Response) => {
  const entry = await sensorDataServices.createTelemetryIntoDB(
    toTelemetry(req.body)
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Telemetry recorded successfully",
    data: entry,
  });
});

const getEntriesByField = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  await assertCanReadField(fieldId, actorOf(req));

  const data = await sensorDataServices.getEntriesByFieldIdFromDB(
    fieldId,
    parseRange(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Telemetry retrieved successfully",
    data,
  });
});

const getRecentEntriesByField = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  await assertCanReadField(fieldId, actorOf(req));

  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const data = await sensorDataServices.getRecentEntriesByFieldIdFromDB(
    fieldId,
    limit
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent telemetry retrieved successfully",
    data,
  });
});

const getLatestByField = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  await assertCanReadField(fieldId, actorOf(req));

  const data = await sensorDataServices.getLatestByFieldIdFromDB(fieldId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: data
      ? "Latest reading retrieved successfully"
      : "No readings recorded for this field yet",
    data,
  });
});

const getAggregatedSeries = catchAsync(async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  await assertCanReadField(fieldId, actorOf(req));

  const data = await sensorDataServices.getAggregatedSeriesFromDB(
    fieldId,
    parseRange(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Telemetry series retrieved successfully",
    data,
  });
});

export const sensorDataController = {
  createTelemetry,
  getEntriesByField,
  getRecentEntriesByField,
  getLatestByField,
  getAggregatedSeries,
};
