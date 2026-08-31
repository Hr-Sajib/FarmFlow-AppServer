import { z } from "zod";
import { POST_TOPICS, REGIONS } from "./post.model";

const topicEnum = z.enum(POST_TOPICS as [string, ...string[]], {
  errorMap: () => ({ message: `Topic must be one of: ${POST_TOPICS.join(", ")}` }),
});

const regionEnum = z.enum(REGIONS as [string, ...string[]], {
  errorMap: () => ({ message: `Region must be one of: ${REGIONS.join(", ")}` }),
});

/**
 * `creatorId` and `creatorRole` are taken from the authenticated token, never
 * the body — `.strict()` rejects any client attempt to supply them, which is
 * what stops a farmer posting as an expert.
 */
const createPostValidationSchema = z.object({
  body: z
    .object({
      postText: z
        .string({ required_error: "Post text is required" })
        .trim()
        .min(1, { message: "Post text cannot be empty" })
        .max(5000, { message: "Post text cannot exceed 5000 characters" }),
      postImage: z
        .string()
        .url({ message: "Post image must be a valid URL" })
        .trim()
        .optional(),
      postTopics: z
        .array(topicEnum)
        .max(5, { message: "At most 5 topics per post" })
        .default([]),
      region: regionEnum.optional(),
    })
    .strict(),
});

const updatePostValidationSchema = z.object({
  body: z
    .object({
      postText: z.string().trim().min(1).max(5000).optional(),
      postImage: z.string().url({ message: "Post image must be a valid URL" }).trim().optional(),
      postTopics: z.array(topicEnum).max(5).optional(),
      region: regionEnum.optional(),
    })
    .strict(),
});

const createCommentValidationSchema = z.object({
  body: z
    .object({
      commentText: z
        .string({ required_error: "Comment text is required" })
        .trim()
        .min(1, { message: "Comment cannot be empty" })
        .max(2000, { message: "Comment cannot exceed 2000 characters" }),
    })
    .strict(),
});

/** Marking a question answered — only the post author or an admin may do this. */
const acceptAnswerValidationSchema = z.object({
  body: z
    .object({
      acceptedCommentId: z
        .string({ required_error: "acceptedCommentId is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid comment id" }),
    })
    .strict(),
});

export const PostValidation = {
  createPostValidationSchema,
  updatePostValidationSchema,
  createCommentValidationSchema,
  acceptAnswerValidationSchema,
};
