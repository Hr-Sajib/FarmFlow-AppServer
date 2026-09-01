import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminStatsServices } from "./adminStats.service";

const getOverview = catchAsync(async (_req: Request, res: Response) => {
  const data = await adminStatsServices.getAdminOverviewFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin overview retrieved successfully",
    data,
  });
});

export const adminStatsController = { getOverview };
