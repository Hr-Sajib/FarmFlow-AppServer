import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { UserModel } from "../user/user.model";
import { AdvisorySessionModel } from "./advisorySession.model";
import { IAdvisorySession, IAdvisoryMessage, TAdvisorySenderRole } from "./advisorySession.interface";
import { TChatMessage, TContentPart } from "../../utils/openRouter";

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

/* ===========================================================================
 * AI advisory: system prompt and prompt assembly
 * ========================================================================= */

/**
 * The advisor's operating instructions. Written to constrain scope, force
 * actionable specifics, and — importantly for a tiered system — to make the
 * model hand off to a human rather than guess when stakes are high.
 */
export const AGRICULTURAL_SYSTEM_PROMPT = `You are the agricultural advisor for FarmFlow, a precision-farming platform used by growers of high-value crops in controlled environments — greenhouses, net houses and intensively managed open fields.

YOUR ROLE
Diagnose crop, soil, irrigation, pest and environmental problems, and tell the farmer exactly what to do about them. You are advising a working farmer during their day, not writing an article.

LANGUAGE
Answer in the same language the farmer writes in. If they write in Bangla, answer entirely in Bangla; if in English, answer in English. Match their register: plain, direct, no jargon unless you define it in the same sentence.

HOW TO ANSWER
- Lead with the action. State what to do first, then why.
- Be quantitative. Give amounts, dilutions, timings, intervals and durations — "water 2 litres per plant at first light, every second day" beats "water regularly".
- Keep to roughly 150 words unless the farmer asks for depth. Density over length.
- At most one short list. Never pad with generalities the farmer already knows.
- If several things could be wrong, name the most likely cause first and say what observation would confirm or rule it out.

USING THE CONTEXT YOU ARE GIVEN
- Field data may accompany the question: crop, soil type, and live sensor readings for temperature, humidity, soil moisture and light. Reason from those actual numbers and refer to them explicitly.
- Photographs may be attached. Describe only what you can genuinely see in them. If an image is blurred, badly lit, or shows too little of the plant, say so and describe the photograph you need instead.

UNCERTAINTY AND SAFETY
- Say plainly when you are not sure. A wrong confident diagnosis costs a farmer a season.
- Never invent a pesticide, fungicide or fertiliser dose. Give the active ingredient and direct the farmer to the product label and local agricultural extension office for the rate.
- Note protective equipment and pre-harvest intervals whenever you mention a chemical treatment.

WHEN TO ESCALATE
Recommend the farmer request a verified human expert through the platform when: the symptoms suggest a notifiable or fast-spreading disease, a substantial part of the crop is at immediate risk, the diagnosis depends on something only a physical inspection or laboratory test can settle, or you would otherwise be guessing. Say so directly and explain what the expert should look at.

SCOPE
Agriculture only — crops, soil, water, pests, disease, climate, farm equipment and post-harvest handling. If asked about anything else, briefly say it is outside what you can help with and invite an agricultural question. Do not give medical, legal or financial advice.`;

/** Instructions used when folding older turns into a compact summary. */
const COMPRESSION_SYSTEM_PROMPT = `You compress agricultural advisory conversations so they can be carried forward as context.

Produce a factual summary that preserves, in this order: the original problem, any diagnosis reached, every specific recommendation given including quantities and timings, what the farmer has already tried and the result, and any question left unresolved.

Omit pleasantries and repetition. Do not add advice of your own. Write in the same language as the conversation. Stay under 250 words.`;

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Total words across a set of messages, used to decide when to compress. */
export const transcriptWordCount = (messages: IAdvisoryMessage[]): number =>
  messages.reduce((total, m) => total + wordCount(m.messageContent), 0);

/**
 * The opening turn: the problem as the farmer stated it, plus any photographs
 * they attached, sent as image parts so a vision model can actually look.
 */
export const buildInitialContext = (
  session: Pick<
    IAdvisorySession,
    "problemStatement" | "problemDetails" | "attachedMediaUrls" | "fieldId"
  >
): TContentPart[] => {
  const lines = [`Problem: ${session.problemStatement}`];
  if (session.problemDetails) lines.push(`Details: ${session.problemDetails}`);
  if (session.fieldId) lines.push(`Field reference: ${session.fieldId}`);

  const parts: TContentPart[] = [{ type: "text", text: lines.join("\n") }];

  for (const url of session.attachedMediaUrls ?? []) {
    if (IMAGE_URL_PATTERN.test(url)) {
      parts.push({ type: "image_url", image_url: { url } });
    } else {
      parts.push({
        type: "text",
        text: `The farmer also attached a non-image file: ${url}`,
      });
    }
  }

  return parts;
};

const IMAGE_URL_PATTERN = /\.(jpe?g|png|gif|webp)(\?|$)/i;

/** One stored message rendered as a chat turn, with images passed through. */
const toChatTurn = (message: IAdvisoryMessage): TChatMessage => {
  const role = message.senderRole === "ai" ? "assistant" : "user";

  if (message.messageType === "image") {
    return {
      role,
      content: [{ type: "image_url", image_url: { url: message.messageContent } }],
    };
  }
  if (message.messageType === "video") {
    // Video is stored but not sent: the model cannot watch it.
    return { role, content: `[the farmer shared a video: ${message.messageContent}]` };
  }
  return { role, content: message.messageContent };
};

/**
 * Assembles the prompt: operating instructions, the compressed summary of
 * older turns if one exists, the original problem with its photographs, then
 * the turns still held verbatim.
 */
export const buildAdvisoryPrompt = (
  session: IAdvisorySession
): TChatMessage[] => {
  const messages: TChatMessage[] = [
    { role: "system", content: AGRICULTURAL_SYSTEM_PROMPT },
  ];

  if (session.contextSummary) {
    messages.push({
      role: "system",
      content: `Summary of the earlier part of this conversation:\n${session.contextSummary}`,
    });
  }

  messages.push({ role: "user", content: buildInitialContext(session) });

  const recent = session.chatHistory.slice(session.summarizedMessageCount ?? 0);
  messages.push(...recent.map(toChatTurn));

  return messages;
};

/** Prompt used to summarise the turns being dropped from verbatim context. */
export const buildCompressionPrompt = (
  messages: IAdvisoryMessage[]
): TChatMessage[] => [
  { role: "system", content: COMPRESSION_SYSTEM_PROMPT },
  {
    role: "user",
    content: messages
      .map((m) => `${m.senderRole.toUpperCase()}: ${m.messageContent}`)
      .join("\n\n"),
  },
];
