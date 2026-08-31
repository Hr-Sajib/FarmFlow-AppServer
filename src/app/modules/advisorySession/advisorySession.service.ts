import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { AdvisorySessionModel } from "./advisorySession.model";
import {
  IAdvisoryMessage,
  IAdvisorySession,
} from "./advisorySession.interface";
import {
  TActor,
  isAdmin,
  getSessionOr404,
  assertCanViewSession,
  assertIsOwnerFarmer,
  assertExpertIsVerified,
} from "./advisorySession.utils";

const createSessionIntoDB = async (
  payload: Partial<IAdvisorySession>,
  actor: TActor
) => {
  return AdvisorySessionModel.create({
    problemStatement: payload.problemStatement,
    problemDetails: payload.problemDetails,
    attachedMediaUrls: payload.attachedMediaUrls ?? [],
    fieldId: payload.fieldId,
    // Ownership comes from the token, never the body.
    farmerId: actor.userCode,
    status: "ai_active",
  });
};

/** Admin-only listing; route guards enforce that. */
const getAllSessionsFromDB = async (filters: {
  status?: string;
  farmerId?: string;
  expertId?: string;
}) => {
  const query: Record<string, unknown> = { isDeleted: false };
  if (filters.status) query.status = filters.status;
  if (filters.farmerId) query.farmerId = filters.farmerId;
  if (filters.expertId) query.expertId = filters.expertId;

  return AdvisorySessionModel.find(query).sort({ createdAt: -1 });
};

/**
 * Scoped to the caller: a farmer sees the sessions they opened, an expert the
 * ones assigned to them, an admin everything.
 */
const getMySessionsFromDB = async (actor: TActor) => {
  if (isAdmin(actor)) {
    return AdvisorySessionModel.find({ isDeleted: false }).sort({ createdAt: -1 });
  }

  const query =
    actor.role === "expert"
      ? { expertId: actor.userCode }
      : { farmerId: actor.userCode };

  return AdvisorySessionModel.find({ ...query, isDeleted: false }).sort({
    createdAt: -1,
  });
};

/** Used by the REST reads and by the socket to authorise a join. */
const getSessionByIdFromDB = async (sessionId: string, actor: TActor) => {
  const session = await getSessionOr404(sessionId);
  assertCanViewSession(session, actor);
  return session;
};

/** Only the farmer who opened it, and only the problem description itself. */
const updateSessionData = async (
  sessionId: string,
  payload: Partial<IAdvisorySession>,
  actor: TActor
) => {
  const session = await getSessionOr404(sessionId);
  assertIsOwnerFarmer(session, actor);

  const updated = await AdvisorySessionModel.findByIdAndUpdate(
    sessionId,
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update session");
  }
  return updated;
};

/** Admin, or the farmer who opened the session, may attach a verified expert. */
const assignExpertToSession = async (
  sessionId: string,
  expertId: string,
  actor: TActor
) => {
  const session = await getSessionOr404(sessionId);

  if (!isAdmin(actor)) {
    assertIsOwnerFarmer(session, actor);
  }

  if (session.status === "resolved" || session.status === "closed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This session is already closed"
    );
  }

  await assertExpertIsVerified(expertId);

  const updated = await AdvisorySessionModel.findByIdAndUpdate(
    sessionId,
    { $set: { expertId, status: "expert_active" } },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to assign expert");
  }
  return updated;
};

/** Admin only. Soft delete, so the transcript is retained. */
const softDeleteSessionInDB = async (sessionId: string) => {
  await getSessionOr404(sessionId);

  return AdvisorySessionModel.findByIdAndUpdate(
    sessionId,
    { isDeleted: true },
    { new: true }
  );
};

/**
 * Appends one message to the transcript. Called by the socket layer, which has
 * already authorised the sender against the session.
 */
const appendMessageToSession = async (
  sessionId: string,
  message: IAdvisoryMessage
) => {
  const updated = await AdvisorySessionModel.findOneAndUpdate(
    { _id: sessionId, isDeleted: false },
    { $push: { chatHistory: message } },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "Advisory session not found");
  }
  return updated;
};

export const advisorySessionServices = {
  createSessionIntoDB,
  getAllSessionsFromDB,
  getMySessionsFromDB,
  getSessionByIdFromDB,
  updateSessionData,
  assignExpertToSession,
  softDeleteSessionInDB,
  appendMessageToSession,
};
