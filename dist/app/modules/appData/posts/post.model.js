"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = void 0;
const mongoose_1 = require("mongoose");
// Define the Reaction schema
const reactionSchema = new mongoose_1.Schema({
    likes: {
        count: { type: Number, default: 0 },
        by: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", trim: true }],
    },
    dislikes: {
        count: { type: Number, default: 0 },
        by: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", trim: true }],
    },
}, { _id: false });
// Define the Comment schema
const commentSchema = new mongoose_1.Schema({
    commenterName: { type: String, trim: true, required: [true, "Commenter name is required"] },
    commenterId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: [true, "Commenter ID is required"] },
    commentText: { type: String, trim: true, required: [true, "Comment text is required"] },
}, { _id: true, timestamps: true });
// Define the Post schema
const postSchema = new mongoose_1.Schema({
    creatorName: { type: String, trim: true, required: [true, "Creator name is required"] },
    creatorPhoto: { type: String, trim: true, required: [true, "Creator image is required"] },
    creatorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: [true, "Creator ID is required"] },
    postText: { type: String, trim: true, required: [true, "Post text is required"] },
    postImage: { type: String, trim: true },
    reactions: { type: reactionSchema, default: { likes: { count: 0, by: [] }, dislikes: { count: 0, by: [] } } },
    comments: [commentSchema],
    postTopics: [{
            type: String,
            enum: {
                values: [
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
                ],
                message: "Post topic must be one of: rice, potato, onion, disease, insect, fertilizer, irrigation, weather, harvest, equipment, market, pest, technology",
            },
        }],
}, {
    timestamps: true,
});
// Export the Mongoose model
exports.PostModel = (0, mongoose_1.model)("Post", postSchema);
