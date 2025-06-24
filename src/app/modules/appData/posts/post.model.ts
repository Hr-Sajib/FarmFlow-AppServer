import { Schema, model, Model, SchemaTypes } from "mongoose"; 
import { IPost, TReaction, TComment } from "./post.interface";

// Reaction schema (nested within Post)
const reactionSchema = new Schema<TReaction>({
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
});

// Comment schema (nested within Post)
const commentSchema = new Schema<TComment>({
  commenterName: { type: String },
  commenterId: { type: SchemaTypes.ObjectId, ref: "User" },
  commentText: { type: String },
});

// Post schema
const postSchema = new Schema<IPost>(
  {
    creatorName: { type: String },
    creatorId: { type: SchemaTypes.ObjectId, ref: "User" }, 
    postText: { type: String },
    postImages: { type: [String], default: [] },
    reactions: { type: reactionSchema, default: { likes: 0, dislikes: 0 } },
    comments: { type: [commentSchema], default: [] },
    aboutCrop: { type: String },
  },
  {
    timestamps: true, 
  }
);


export const PostModel: Model<IPost> = model<IPost>("Post", postSchema);