import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { publicServices } from "./public.service";

/**
 * The hero polls this every few seconds, so it is cached briefly at the edge.
 * A visitor still sees the value move; the database sees one read per window
 * however many people have the page open.
 */
const getLatestReading = catchAsync(async (_req: Request, res: Response) => {
  const reading = await publicServices.getLatestPublicReadingFromDB();

  res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=30");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: reading
      ? "Latest public reading retrieved successfully"
      : "No telemetry has been recorded yet",
    data: reading,
  });
});

const getStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await publicServices.getPublicStatsFromDB();

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Platform statistics retrieved successfully",
    data: stats,
  });
});

export const publicController = {
  getLatestReading,
  getStats,
};
