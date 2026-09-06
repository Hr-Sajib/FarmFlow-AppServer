import express, { Request, Response } from "express";
import httpStatus from "http-status";

import auth from "../../middlewares/auth";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { expertStatsServices } from "./expertStats.service";

const router = express.Router();

/** Scoped to the caller — an expert's own record, never another's. */
router.get(
  "/overview",
  auth("expert"),
  catchAsync(async (req: Request, res: Response) => {
    const data = await expertStatsServices.getExpertOverviewFromDB(
      req.user.userId,
      req.user.userCode as string
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Expert overview retrieved successfully",
      data,
    });
  })
);

export const ExpertStatsRoutes = router;
