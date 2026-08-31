import { Schema, model } from "mongoose";
import { IAdvisoryMessage, IAdvisorySession } from "./advisorySession.interface";

const advisoryMessageSchema = new Schema<IAdvisoryMessage>(
  {
    senderRole: {
      type: String,
      enum: {
        values: ["farmer", "expert", "ai"],
        message: "Sender role must be one of: farmer, expert, ai",
      },
      required: [true, "Sender role is required"],
    },
    senderId: { type: String, trim: true },
    messageType: {
      type: String,
      enum: {
        values: ["text", "image", "video"],
        message: "Message type must be one of: text, image, video",
      },
      default: "text",
    },
    messageContent: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const advisorySessionSchema = new Schema<IAdvisorySession>(
  {
    farmerId: {
      type: String,
      trim: true,
      required: [true, "Farmer id is required"],
    },
    fieldId: { type: String, trim: true },

    problemStatement: {
      type: String,
      trim: true,
      required: [true, "Problem statement is required"],
    },
    problemDetails: { type: String, trim: true },
    attachedMediaUrls: [{ type: String, trim: true }],

    status: {
      type: String,
      enum: {
        values: [
          "ai_active",
          "awaiting_expert",
          "expert_active",
          "resolved",
          "closed",
        ],
        message:
          "Status must be one of: ai_active, awaiting_expert, expert_active, resolved, closed",
      },
      default: "ai_active",
    },
    expertId: { type: String, trim: true },

    // Embedded because a session is always read whole and is bounded in
    // practice. If threads ever grow unbounded this moves to its own
    // collection keyed by session id — the 16MB document cap is the limit.
    chatHistory: { type: [advisoryMessageSchema], default: [] },

    contextSummary: { type: String, trim: true },
    summarizedMessageCount: { type: Number, default: 0 },

    feedbackText: { type: String, trim: true },
    feedbackStarCount: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
    },

    resolvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A farmer's own sessions, newest first.
advisorySessionSchema.index({ farmerId: 1, isDeleted: 1, createdAt: -1 });
// The expert queue: unassigned sessions waiting for a human.
advisorySessionSchema.index({ status: 1, createdAt: 1 });

export const AdvisorySessionModel = model<IAdvisorySession>(
  "AdvisorySession",
  advisorySessionSchema
);
