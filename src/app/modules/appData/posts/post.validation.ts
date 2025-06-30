import { z } from "zod";
import { TPostTopic } from "./post.interface";

// Define allowed post topics
const postTopicEnum = z.enum([
  "rice",
  "potato",
  "onion",
  "disease",
  "insect",
  "fertilizer",
  "irrigation",
  "weather",
  "harvest",
  "equipment",
  "market",
  "pest",
  "technology",
], { message: "Post topic must be one of: rice, potato, onion, disease, insect, fertilizer, irrigation, weather, harvest, equipment, market, pest, technology" });

// Define reaction schema
const reactionSchema = z.object({
  likes: z.object({
    count: z.number({ invalid_type_error: "Likes count must be a number" }).nonnegative().default(0),
    by: z.array(
      z.string({ invalid_type_error: "User ID must be a string" }).refine(
        (value) => /^[0-9a-fA-F]{24}$/.test(value),
        { message: "User ID must be a valid ObjectId" }
      )
    ).default([]),
  }).strict(),
  dislikes: z.object({
    count: z.number({ invalid_type_error: "Dislikes count must be a number" }).nonnegative().default(0),
    by: z.array(
      z.string({ invalid_type_error: "User ID must be a string" }).refine(
        (value) => /^[0-9a-fA-F]{24}$/.test(value),
        { message: "User ID must be a valid ObjectId" }
      )
    ).default([]),
  }).strict(),
}).strict();

// Define comment schema
const commentSchema = z.object({
  commenterName: z.string({ invalid_type_error: "Commenter name must be a string", required_error: "Commenter name is required" }).trim().min(1, "Commenter name cannot be empty"),
  commenterId: z.string({ invalid_type_error: "Commenter ID must be a string", required_error: "Commenter ID is required" }).refine(
    (value) => /^[0-9a-fA-F]{24}$/.test(value),
    { message: "Commenter ID must be a valid ObjectId" }
  ),
  commentText: z.string({ invalid_type_error: "Comment text must be a string", required_error: "Comment text is required" }).trim().min(1, "Comment text cannot be empty"),
}).strict();

// Define create post validation schema
const createPostValidationSchema = z.object({
  body: z.object({
    postText: z.string({ invalid_type_error: "Post text must be a string", required_error: "Post text is required" }).trim().min(1, "Post text cannot be empty"),
    postImage: z.string({ invalid_type_error: "Post image must be a string" }).url({ message: "Post image must be a valid URL" }).optional().optional(),
    reactions: reactionSchema.optional(),
    comments: z.array(commentSchema).optional(),
    postTopics: z.array(postTopicEnum, { invalid_type_error: "Post topics must be an array", required_error: "At least one post topic is required" }).min(1, "At least one post topic is required"),
  }).strict(),
});

// Define update post validation schema
const updatePostValidationSchema = z.object({
  body: z.object({
    creatorName: z.string({ invalid_type_error: "Creator name must be a string" }).trim().min(1, "Creator name cannot be empty").optional(),
    creatorId: z.string({ invalid_type_error: "Creator ID must be a string" }).refine(
      (value) => /^[0-9a-fA-F]{24}$/.test(value),
      { message: "Creator ID must be a valid ObjectId" }
    ).optional(),
    postText: z.string({ invalid_type_error: "Post text must be a string" }).trim().min(1, "Post text cannot be empty").optional(),
    postImage: z.string({ invalid_type_error: "Post image must be a string" }).url({ message: "Post image must be a valid URL" }).optional().optional(),
    reactions: reactionSchema.optional(),
    comments: z.array(commentSchema).optional(),
    postTopic: z.array(postTopicEnum, { invalid_type_error: "Post topics must be an array" }).min(1, "At least one post topic is required").optional(),
  }).strict(),
});

export const PostValidation = {
  createPostValidationSchema,
  updatePostValidationSchema,
};