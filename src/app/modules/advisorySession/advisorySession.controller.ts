import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { advisorySessionServices } from "./advisorySession.service";
import { TActor } from "./advisorySession.utils";

const actorOf = (req: Request): TActor => ({
  userId: req.user.userId,
  role: req.user.role,
  userCode: req.user.userCode,
});

const createSession = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.createSessionIntoDB(
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Advisory session created successfully",
    data: session,
  });
});

const getAllSessions = catchAsync(async (req: Request, res: Response) => {
  const { status, farmerId, expertId } = req.query as {
    status?: string;
    farmerId?: string;
    expertId?: string;
  };
  const sessions = await advisorySessionServices.getAllSessionsFromDB({
    status,
    farmerId,
    expertId,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advisory sessions retrieved successfully",
    data: sessions,
  });
});

const getMySessions = catchAsync(async (req: Request, res: Response) => {
  const sessions = await advisorySessionServices.getMySessionsFromDB(actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your advisory sessions retrieved successfully",
    data: sessions,
  });
});

const updateSession = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.updateSessionData(
    req.params.sessionId,
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advisory session updated successfully",
    data: session,
  });
});

const assignHumanExpert = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.assignExpertToSession(
    req.params.sessionId,
    req.body.expertId,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expert assigned successfully",
    data: session,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.updateSessionStatus(
    req.params.sessionId,
    req.body.status,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Session status updated",
    data: session,
  });
});

const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.submitSessionFeedback(
    req.params.sessionId,
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Thanks for the feedback",
    data: session,
  });
});

const softDeleteSession = catchAsync(async (req: Request, res: Response) => {
  const session = await advisorySessionServices.softDeleteSessionInDB(
    req.params.sessionId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Advisory session deleted successfully",
    data: session,
  });
});

export const advisorySessionController = {
  createSession,
  getAllSessions,
  getMySessions,
  updateSession,
  assignHumanExpert,
  updateStatus,
  submitFeedback,
  softDeleteSession,
};
