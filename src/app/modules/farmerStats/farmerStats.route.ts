import express, { Request, Response } from "express";
import httpStatus from "http-status";

import auth from "../../middlewares/auth";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { farmerStatsServices } from "./farmerStats.service";

const router = express.Router();

/** Scoped to the caller — a farmer's own record, never another's. */
router.get(
  "/overview",
  auth("farmer"),
  catchAsync(async (req: Request, res: Response) => {
    const data = await farmerStatsServices.getFarmerOverviewFromDB(
      req.user.userId,
      req.user.userCode as string
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Farmer overview retrieved successfully",
      data,
    });
  })
);

export const FarmerStatsRoutes = router;
