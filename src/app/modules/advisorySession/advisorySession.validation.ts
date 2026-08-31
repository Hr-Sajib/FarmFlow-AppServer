import { z } from "zod";

/**
 * Opening a session. `farmerId` comes from the authenticated token, never the
 * body — and `.strict()` rejects it if a client tries to supply one, which is
 * what prevents opening a session on someone else's behalf.
 */
const createAdvisorySessionValidationSchema = z.object({
  body: z
    .object({
      problemStatement: z
        .string({ required_error: "Problem statement is required" })
        .trim()
        .min(5, { message: "Problem statement must be at least 5 characters" })
        .max(300, { message: "Problem statement cannot exceed 300 characters" }),
      problemDetails: z
        .string()
        .trim()
        .max(5000, { message: "Problem details cannot exceed 5000 characters" })
        .optional(),
      attachedMediaUrls: z
        .array(z.string().url({ message: "Each attachment must be a valid URL" }))
        .max(10, { message: "At most 10 attachments" })
        .default([]),
      fieldId: z.string().trim().optional(),
    })
    .strict(),
});

/** The farmer who opened the session may revise only the problem it describes. */
const updateAdvisorySessionValidationSchema = z.object({
  body: z
    .object({
      problemStatement: z
        .string()
        .trim()
        .min(5, { message: "Problem statement must be at least 5 characters" })
        .max(300, { message: "Problem statement cannot exceed 300 characters" })
        .optional(),
      problemDetails: z
        .string()
        .trim()
        .max(5000, { message: "Problem details cannot exceed 5000 characters" })
        .optional(),
      attachedMediaUrls: z
        .array(z.string().url({ message: "Each attachment must be a valid URL" }))
        .max(10, { message: "At most 10 attachments" })
        .optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

/** Attaching a human expert to the session. */
const assignExpertValidationSchema = z.object({
  body: z
    .object({
      expertId: z
        .string({ required_error: "expertId is required" })
        .trim()
        .regex(/^expert[0-9]{8}$/, {
          message: 'Expert id must look like "expert12345678"',
        }),
    })
    .strict(),
});

/**
 * Posting a message. `senderRole` and `senderId` are derived server-side from
 * the token so a farmer cannot post as an expert or impersonate the AI.
 */
const postMessageValidationSchema = z.object({
  body: z
    .object({
      messageType: z.enum(["text", "image", "video"]).default("text"),
      messageContent: z
        .string({ required_error: "Message content is required" })
        .trim()
        .min(1, { message: "Message cannot be empty" })
        .max(5000, { message: "Message cannot exceed 5000 characters" }),
    })
    .strict()
    .refine(
      (data) =>
        data.messageType === "text" ||
        /^https?:\/\//i.test(data.messageContent),
      {
        message: "Image and video messages must carry a URL as content",
        path: ["messageContent"],
      }
    ),
});

const submitFeedbackValidationSchema = z.object({
  body: z
    .object({
      feedbackStarCount: z
        .number({ required_error: "A star rating is required" })
        .int({ message: "Rating must be a whole number" })
        .min(1, { message: "Rating must be between 1 and 5" })
        .max(5, { message: "Rating must be between 1 and 5" }),
      feedbackText: z
        .string()
        .trim()
        .max(1000, { message: "Feedback cannot exceed 1000 characters" })
        .optional(),
    })
    .strict(),
});

/** Expert or admin moving a session along its lifecycle. */
const updateStatusValidationSchema = z.object({
  body: z
    .object({
      status: z.enum(
        ["ai_active", "awaiting_expert", "expert_active", "resolved", "closed"],
        {
          errorMap: () => ({
            message:
              "Status must be one of: ai_active, awaiting_expert, expert_active, resolved, closed",
          }),
        }
      ),
    })
    .strict(),
});

export const AdvisorySessionValidation = {
  createAdvisorySessionValidationSchema,
  updateAdvisorySessionValidationSchema,
  assignExpertValidationSchema,
  postMessageValidationSchema,
  submitFeedbackValidationSchema,
  updateStatusValidationSchema,
};
