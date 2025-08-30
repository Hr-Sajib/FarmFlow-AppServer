"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostValidation = void 0;
const zod_1 = require("zod");
// Define allowed post topics
const postTopicEnum = zod_1.z.enum([
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
const reactionSchema = zod_1.z.object({
    likes: zod_1.z.object({
        count: zod_1.z.number({ invalid_type_error: "Likes count must be a number" }).nonnegative().default(0),
        by: zod_1.z.array(zod_1.z.string({ invalid_type_error: "User ID must be a string" }).refine((value) => /^[0-9a-fA-F]{24}$/.test(value), { message: "User ID must be a valid ObjectId" })).default([]),
    }).strict(),
    dislikes: zod_1.z.object({
        count: zod_1.z.number({ invalid_type_error: "Dislikes count must be a number" }).nonnegative().default(0),
        by: zod_1.z.array(zod_1.z.string({ invalid_type_error: "User ID must be a string" }).refine((value) => /^[0-9a-fA-F]{24}$/.test(value), { message: "User ID must be a valid ObjectId" })).default([]),
    }).strict(),
}).strict();
// Define comment schema
const commentSchema = zod_1.z.object({
    commenterName: zod_1.z.string({ invalid_type_error: "Commenter name must be a string", required_error: "Commenter name is required" }).trim().min(1, "Commenter name cannot be empty"),
    commenterId: zod_1.z.string({ invalid_type_error: "Commenter ID must be a string", required_error: "Commenter ID is required" }).refine((value) => /^[0-9a-fA-F]{24}$/.test(value), { message: "Commenter ID must be a valid ObjectId" }),
    commentText: zod_1.z.string({ invalid_type_error: "Comment text must be a string", required_error: "Comment text is required" }).trim().min(1, "Comment text cannot be empty"),
}).strict();
// Define create post validation schema
const createPostValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        postText: zod_1.z.string({ invalid_type_error: "Post text must be a string", required_error: "Post text is required" }).trim().min(1, "Post text cannot be empty"),
        postImage: zod_1.z.string({ invalid_type_error: "Post image must be a string" }).url({ message: "Post image must be a valid URL" }).optional().optional(),
        reactions: reactionSchema.optional(),
        comments: zod_1.z.array(commentSchema).optional(),
        postTopics: zod_1.z.array(postTopicEnum, { invalid_type_error: "Post topics must be an array", required_error: "At least one post topic is required" }).min(1, "At least one post topic is required"),
    }).strict(),
});
// Define update post validation schema
const updatePostValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        creatorName: zod_1.z.string({ invalid_type_error: "Creator name must be a string" }).trim().min(1, "Creator name cannot be empty").optional(),
        creatorId: zod_1.z.string({ invalid_type_error: "Creator ID must be a string" }).refine((value) => /^[0-9a-fA-F]{24}$/.test(value), { message: "Creator ID must be a valid ObjectId" }).optional(),
        postText: zod_1.z.string({ invalid_type_error: "Post text must be a string" }).trim().min(1, "Post text cannot be empty").optional(),
        postImage: zod_1.z.string({ invalid_type_error: "Post image must be a string" }).url({ message: "Post image must be a valid URL" }).optional().optional(),
        reactions: reactionSchema.optional(),
        comments: zod_1.z.array(commentSchema).optional(),
        postTopic: zod_1.z.array(postTopicEnum, { invalid_type_error: "Post topics must be an array" }).min(1, "At least one post topic is required").optional(),
    }).strict(),
});
exports.PostValidation = {
    createPostValidationSchema,
    updatePostValidationSchema,
};
