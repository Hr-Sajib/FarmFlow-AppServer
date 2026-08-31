import { Schema, model } from "mongoose";
import { IPost, TReaction, TComment } from "./post.interface";

const POST_TOPICS = [
  "rice", "potato", "onion", "tomato", "wheat", "maize", "jute", "mango",
  "vegetables", "fruits",
  "disease", "insect", "pest", "weed", "salinity", "drought", "flood",
  "fertilizer", "irrigation", "drainage", "seed", "soil", "nutrient",
  "mulching", "pruning", "pollination", "harvest", "storage",
  "greenhouse", "hydroponics", "organic", "weather", "equipment", "technology",
  "market", "pricing",
];

const REGIONS = [
  "barishal", "chattogram", "dhaka", "khulna",
  "mymensingh", "rajshahi", "rangpur", "sylhet",
];

const CREATOR_ROLES = ["farmer", "expert", "admin"];

const reactionSchema = new Schema<TReaction>(
  {
    likes: {
      count: { type: Number, default: 0 },
      by: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    dislikes: {
      count: { type: Number, default: 0 },
      by: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
  },
  { _id: false }
);

const commentSchema = new Schema<TComment>(
  {
    commenterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Commenter ID is required"],
    },
    commenterRole: {
      type: String,
      enum: { values: CREATOR_ROLES, message: "Invalid commenter role" },
      required: [true, "Commenter role is required"],
    },
    commentText: {
      type: String,
      trim: true,
      required: [true, "Comment text is required"],
    },
  },
  { _id: true, timestamps: true }
);

const postSchema = new Schema<IPost>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
    },
    creatorRole: {
      type: String,
      enum: { values: CREATOR_ROLES, message: "Invalid creator role" },
      required: [true, "Creator role is required"],
    },

    postText: {
      type: String,
      trim: true,
      required: [true, "Post text is required"],
    },
    postImage: { type: String, trim: true },
    postTopics: [
      {
        type: String,
        enum: {
          values: POST_TOPICS,
          message: `Post topic must be one of: ${POST_TOPICS.join(", ")}`,
        },
      },
    ],
    region: {
      type: String,
      enum: { values: REGIONS, message: `Region must be one of: ${REGIONS.join(", ")}` },
    },

    reactions: {
      type: reactionSchema,
      default: () => ({
        likes: { count: 0, by: [] },
        dislikes: { count: 0, by: [] },
      }),
    },
    comments: { type: [commentSchema], default: [] },

    isResolved: { type: Boolean, default: false },
    acceptedCommentId: { type: Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Feed and knowledge-base browsing: newest first, filtered by topic/region.
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ postTopics: 1, region: 1, isDeleted: 1 });

export const PostModel = model<IPost>("Post", postSchema);
export { POST_TOPICS, REGIONS, CREATOR_ROLES };
