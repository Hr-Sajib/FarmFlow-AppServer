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
  buildAdvisoryPrompt,
  buildCompressionPrompt,
  transcriptWordCount,
} from "./advisorySession.utils";
import { createChatCompletion, streamChatCompletion } from "../../utils/openRouter";
import config from "../../../config";

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

/**
 * Moves a session along its lifecycle. Open to the owning farmer, the assigned
 * expert, or an admin — anyone party to the conversation can call it finished.
 */
const updateSessionStatus = async (
  sessionId: string,
  status: IAdvisorySession["status"],
  actor: TActor
) => {
  const session = await getSessionOr404(sessionId);
  assertCanViewSession(session, actor);

  const updated = await AdvisorySessionModel.findByIdAndUpdate(
    sessionId,
    {
      $set: {
        status,
        ...(status === "resolved" ? { resolvedAt: new Date() } : {}),
      },
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update status");
  }
  return updated;
};

/** Only the farmer who asked can say whether the answer helped. */
const submitSessionFeedback = async (
  sessionId: string,
  feedback: { feedbackStarCount: number; feedbackText?: string },
  actor: TActor
) => {
  const session = await getSessionOr404(sessionId);
  assertIsOwnerFarmer(session, actor);

  const updated = await AdvisorySessionModel.findByIdAndUpdate(
    sessionId,
    { $set: feedback },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to save feedback");
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


/**
 * Folds the older half of a long transcript into a single summary.
 *
 * Only the turns beyond the most recent few are compressed, so the immediate
 * back-and-forth stays verbatim while total prompt size remains bounded no
 * matter how long the conversation runs. Costs one model call of its own,
 * which is why it runs only once the word budget is actually exceeded.
 */
const compressSessionContext = async (sessionId: string) => {
  const session = await AdvisorySessionModel.findById(sessionId);
  if (!session) return;

  const alreadySummarized = session.summarizedMessageCount ?? 0;
  const pending = session.chatHistory.slice(alreadySummarized);

  if (transcriptWordCount(pending) <= config.openrouter.context_word_limit) {
    return;
  }

  const keepRecent = config.openrouter.keep_recent_messages;
  const toCompress = pending.slice(0, Math.max(0, pending.length - keepRecent));
  if (toCompress.length === 0) return;

  // Feed the previous summary in alongside, so nothing is lost across
  // successive compressions.
  const prompt = buildCompressionPrompt(toCompress);
  if (session.contextSummary) {
    prompt.splice(1, 0, {
      role: "system",
      content: `Earlier summary to fold in:\n${session.contextSummary}`,
    });
  }

  const summary = await createChatCompletion(prompt, {
    temperature: 0.2,
    maxTokens: 400,
  });

  await AdvisorySessionModel.findByIdAndUpdate(sessionId, {
    $set: {
      contextSummary: summary,
      summarizedMessageCount: alreadySummarized + toCompress.length,
    },
  });
};

/**
 * Produces the AI advisor's next turn and appends it to the transcript.
 *
 * Returns null when a human expert has taken the session over — once escalated,
 * the AI stops answering so the two are never talking at once.
 */
const generateAiReplyForSession = async (
  sessionId: string,
  onChunk?: (delta: string) => void
): Promise<IAdvisoryMessage | null> => {
  const session = await AdvisorySessionModel.findOne({
    _id: sessionId,
    isDeleted: false,
  });
  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Advisory session not found");
  }
  if (session.status !== "ai_active") return null;

  const prompt = buildAdvisoryPrompt(session);

  // Streamed when the caller supplies a chunk handler, so the socket can relay
  // tokens as they arrive; buffered otherwise.
  const replyText = onChunk
    ? await streamChatCompletion(prompt, onChunk)
    : await createChatCompletion(prompt);

  const message: IAdvisoryMessage = {
    senderRole: "ai",
    messageType: "text",
    messageContent: replyText,
    sentAt: new Date(),
  };

  await appendMessageToSession(sessionId, message);

  // Compress after appending, so the next turn starts from a bounded context.
  await compressSessionContext(sessionId);

  return message;
};

export const advisorySessionServices = {
  createSessionIntoDB,
  getAllSessionsFromDB,
  getMySessionsFromDB,
  getSessionByIdFromDB,
  updateSessionData,
  assignExpertToSession,
  softDeleteSessionInDB,
  updateSessionStatus,
  submitSessionFeedback,
  appendMessageToSession,
  generateAiReplyForSession,
};
