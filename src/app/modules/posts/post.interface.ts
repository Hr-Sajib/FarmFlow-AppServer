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

  // Knowledge-base behaviour: a thread is a question until an answer is accepted.
  isResolved: boolean;
  acceptedCommentId?: Types.ObjectId;

  isDeleted: boolean;
}
