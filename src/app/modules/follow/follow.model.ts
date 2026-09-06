import { Schema, model } from "mongoose";

export interface IFollow {
  /** userCode of the person doing the following. */
  followerCode: string;
  /** userCode of the person being followed. */
  followingCode: string;
  createdAt?: Date;
}

/**
 * Follows are their own collection rather than two arrays on the user.
 *
 * An array of followers is unbounded — a popular expert would grow a document
 * that every read of that user has to carry, and the 16MB cap is a real
 * ceiling rather than a theoretical one. A row per edge also makes "is A
 * following B" a single indexed lookup instead of a scan of an array.
 */
const followSchema = new Schema<IFollow>(
  {
    followerCode: { type: String, required: true, trim: true },
    followingCode: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

// One edge per pair. Unique rather than checked in code: two concurrent
// follows would both pass a read-then-write check.
followSchema.index({ followerCode: 1, followingCode: 1 }, { unique: true });
// "who follows this person", the count shown on a profile.
followSchema.index({ followingCode: 1 });

export const FollowModel = model<IFollow>("Follow", followSchema);
