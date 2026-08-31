import httpStatus from "http-status";
import { Types } from "mongoose";

import AppError from "../../errors/AppError";
import { PostModel } from "./post.model";

/** The authenticated caller, resolved by the auth middleware. */
export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

export const isAdmin = (actor: TActor): boolean => actor.role === "admin";

export const getPostOr404 = async (postId: string) => {
  const post = await PostModel.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }
  return post;
};

export const isCreator = (
  post: { creatorId: Types.ObjectId },
  actor: TActor
): boolean => post.creatorId.toString() === actor.userId;

/**
 * Editing is restricted to the author even for admins: an admin altering
 * someone else's words is a different power from removing the post, and only
 * the second is a moderation action.
 */
export const assertCanEdit = (
  post: { creatorId: Types.ObjectId },
  actor: TActor
): void => {
  if (!isCreator(post, actor)) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only edit your own posts");
  }
};

/** Removal is a moderation action, so admins may delete any post. */
export const assertCanDelete = (
  post: { creatorId: Types.ObjectId },
  actor: TActor
): void => {
  if (!isAdmin(actor) && !isCreator(post, actor)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete your own posts"
    );
  }
};

/** Author name and photo are populated rather than copied, so edits propagate. */
export const POST_POPULATE = [
  { path: "creatorId", select: "fullName photo role userCode" },
  { path: "comments.commenterId", select: "fullName photo role userCode" },
];
