import { Types } from "mongoose";

export type TCreatorRole = "farmer" | "expert" | "admin";

export type TPostTopic =
  // crops
  | "rice"
  | "potato"
  | "onion"
  | "tomato"
  | "wheat"
  | "maize"
  | "jute"
  | "mango"
  | "vegetables"
  | "fruits"
  // problems
  | "disease"
  | "insect"
  | "pest"
  | "weed"
  | "salinity"
  | "drought"
  | "flood"
  // practice
  | "fertilizer"
  | "irrigation"
  | "drainage"
  | "seed"
  | "soil"
  | "nutrient"
  | "mulching"
  | "pruning"
  | "pollination"
  | "harvest"
  | "storage"
  // environment & tooling
  | "greenhouse"
  | "hydroponics"
  | "organic"
  | "weather"
  | "equipment"
  | "technology"
  // commerce
  | "market"
  | "pricing";

/** Bangladesh divisions — problems differ sharply by region. */
export type TRegion =
  | "barishal"
  | "chattogram"
  | "dhaka"
  | "khulna"
  | "mymensingh"
  | "rajshahi"
  | "rangpur"
  | "sylhet";

/**
 * Just the voter ids — no stored counts. A `count` field alongside the array
 * is a denormalised copy that drifts, and maintaining it required a
 * read-check-then-$inc sequence that two concurrent requests could both pass.
 * Counts are derived from array length; $addToSet/$pull make a second reaction
 * from the same user structurally impossible rather than merely checked.
 */
export type TReaction = {
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
};

export type TReactionType = "like" | "dislike";

export type TComment = {
  /** Name and photo are populated from this ref, never copied — copies go stale. */
  commenterId: Types.ObjectId;
  commenterRole: TCreatorRole;
  commentText: string;
};

export interface IPost {
  creatorId: Types.ObjectId;
  /** Denormalized so expert answers can be filtered without a join. */
  creatorRole: TCreatorRole;

  postText: string;
  postImage?: string;
  postTopics: TPostTopic[];
  region?: TRegion;

  reactions: TReaction;
  comments: TComment[];

  /**
   * Verdict from the automated review.
   *
   * Three states, and the third is the absence of the field: undefined means
   * the review has not returned yet, true means published, false means held
   * back. A boolean defaulting to false could not tell "waiting" from
   * "rejected", and those need different words on screen.
   */
  /**
   * A field as it was when the post was written, stored by value. Not a
   * reference to the field: the readings that prompted the question are the
   * point, and they would be gone by the time anyone answered.
   */
  fieldSnapshot?: Record<string, unknown>;

  isPassedByAI?: boolean;
  /** Why the review rejected it, shown to the author so they can fix it. */
  reviewNote?: string;
  reviewedAt?: Date;

  // Knowledge-base behaviour: a thread is a question until an answer is accepted.
  isResolved: boolean;
  acceptedCommentId?: Types.ObjectId;

  isDeleted: boolean;

  // Written by mongoose; the feed cursor is built from createdAt.
  createdAt?: Date;
  updatedAt?: Date;
}
