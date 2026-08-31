import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { UserModel } from "../user/user.model";
import { AdvisorySessionModel } from "./advisorySession.model";
import { IAdvisorySession, TAdvisorySenderRole } from "./advisorySession.interface";

/** The authenticated caller, resolved by the auth middleware or socket handshake. */
export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

export const isAdmin = (actor: TActor): boolean => actor.role === "admin";

export const getSessionOr404 = async (sessionId: string) => {
  const session = await AdvisorySessionModel.findOne({
    _id: sessionId,
    isDeleted: false,
  });
  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Advisory session not found");
  }
  return session;
};

/** The farmer who opened the session. */
export const isOwnerFarmer = (
  session: Pick<IAdvisorySession, "farmerId">,
  actor: TActor
): boolean => session.farmerId === actor.userCode;

/** The expert currently assigned to it, if any. */
export const isAssignedExpert = (
  session: Pick<IAdvisorySession, "expertId">,
  actor: TActor
): boolean => Boolean(session.expertId) && session.expertId === actor.userCode;

/**
 * A session is private to its farmer and its assigned expert; admins may see
 * any of them. Used by the REST reads and by every socket event.
 */
export const canViewSession = (
  session: Pick<IAdvisorySession, "farmerId" | "expertId">,
  actor: TActor
): boolean =>
  isAdmin(actor) || isOwnerFarmer(session, actor) || isAssignedExpert(session, actor);

export const assertCanViewSession = (
  session: Pick<IAdvisorySession, "farmerId" | "expertId">,
  actor: TActor
): void => {
  if (!canViewSession(session, actor)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have access to this advisory session"
    );
  }
};

export const assertIsOwnerFarmer = (
  session: Pick<IAdvisorySession, "farmerId">,
  actor: TActor
): void => {
  if (!isOwnerFarmer(session, actor)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the farmer who opened this session can do that"
    );
  }
};

/** Only a verified expert may be attached to a session. */
export const assertExpertIsVerified = async (expertCode: string): Promise<void> => {
  const expert = await UserModel.findOne({
    userCode: expertCode,
    role: "expert",
    expertStatus: "verified",
    isDeleted: false,
  });
  if (!expert) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No verified expert with id ${expertCode}`
    );
  }
};

/**
 * Which sender role a participant writes as. Derived from the caller's own
 * role so a farmer cannot post a message attributed to an expert or the AI.
 */
export const senderRoleFor = (actor: TActor): TAdvisorySenderRole =>
  actor.role === "expert" ? "expert" : "farmer";
