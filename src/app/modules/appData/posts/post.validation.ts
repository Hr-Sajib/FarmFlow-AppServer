import { z } from "zod";

// Define the Reaction schema
const reactionSchema = z.object({
  likes: z.number().nonnegative().default(0),
  dislikes: z.number().nonnegative().default(0),
});

// Define the Comment schema
const commentSchema = z.object({
  commenterName: z.string().min(1, "Commenter name is required"),
  commenterId: z.string().min(1, "Commenter ID is required"), // String representation of ObjectId
  commentText: z.string().min(1, "Comment text is required"),
});

// Define the Post creation schema within a body object
export const createPostValidationSchema = z.object({
  body: z.object({
    creatorName: z.string().min(1, "Creator name is required"),
    creatorId: z.string().min(1, "Creator ID is required"), // String representation of ObjectId
    postText: z.string().min(1, "Post text is required"),
    postImages: z.array(z.string()).default([]),
    reactions: reactionSchema.default({ likes: 0, dislikes: 0 }),
    comments: z.array(commentSchema).default([]),
    aboutCrop: z.string().min(1, "About crop is required"),
  }),
});

// Define the Post update schema within a body object (partial and optional fields)
export const updatePostValidationSchema = z.object({
  body: z.object({
    creatorName: z.string().min(1, "Creator name is required").optional(),
    creatorId: z.string().min(1, "Creator ID is required").optional(), // String representation of ObjectId
    postText: z.string().min(1, "Post text is required").optional(),
    postImages: z.array(z.string()).optional(),
    reactions: reactionSchema.optional(),
    comments: z.array(commentSchema).optional(),
    aboutCrop: z.string().min(1, "About crop is required").optional(),
  }).strict(), // Ensures only defined fields are allowed
});