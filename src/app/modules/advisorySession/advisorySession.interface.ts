export type TAdvisorySenderRole = "farmer" | "expert" | "ai";
export type TAdvisoryMessageType = "text" | "image" | "video";

/**
 * Lifecycle of one advisory thread. A single enum rather than the
 * `isHumanExpertCalled` + `isResolved` boolean pair, because two booleans
 * admit combinations that are meaningless (e.g. resolved while an expert
 * request is still outstanding).
 */
export type TAdvisoryStatus =
  | "ai_active"
  | "awaiting_expert"
  | "expert_active"
  | "resolved"
  | "closed";

export interface IAdvisoryMessage {
  /**
   * Explicit rather than inferred from the id prefix on the client — the
   * frontend should never have to parse an identifier to render a bubble.
   */
  senderRole: TAdvisorySenderRole;
  senderId?: string; // userCode; absent when senderRole is "ai"
  messageType: TAdvisoryMessageType;
  messageContent: string; // text body, or the S3 URL for image/video
  sentAt: Date;
}

export interface IAdvisorySession {
  farmerId: string; // userCode of the farmer who opened the session

  /**
   * Optional link to the field this question is about. When present the
   * advisory layer can enrich the prompt with live sensor readings, the
   * SoilGrids profile and the crop — which is what separates this from a
   * generic agriculture chatbot.
   */
  fieldId?: string;

  problemStatement: string;
  problemDetails?: string;
  attachedMediaUrls: string[];

  status: TAdvisoryStatus;
  expertId?: string; // userCode of the assigned expert

  chatHistory: IAdvisoryMessage[];

  feedbackText?: string;
  feedbackStarCount?: number; // 1–5

  resolvedAt?: Date;
  isDeleted: boolean;
}
