import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { IPost, TComment, TReactionType } from "./post.interface";
import { PostModel } from "./post.model";
import {
  TActor,
  getPostOr404,
  assertCanEdit,
  assertCanDelete,
  POST_POPULATE,
} from "./post.utils";

const createPostIntoDB = async (postData: Partial<IPost>, actor: TActor) => {
  const created = await PostModel.create({
    postText: postData.postText,
    postImage: postData.postImage,
    postTopics: postData.postTopics ?? [],
    region: postData.region,
    // Author and role come from the token, never the body.
    creatorId: actor.userId,
    creatorRole: actor.role,
  });

  return created.populate(POST_POPULATE);
};

const getAllPostsFromDB = async (filters: {
  topic?: string;
  region?: string;
  creatorId?: string;
}) => {
  const query: Record<string, unknown> = { isDeleted: false };
  if (filters.topic) query.postTopics = filters.topic;
  if (filters.region) query.region = filters.region;
  if (filters.creatorId) query.creatorId = filters.creatorId;

  return PostModel.find(query).populate(POST_POPULATE).sort({ createdAt: -1 });
};

const getPostByIdFromDB = async (postId: string) => {
  const post = await PostModel.findOne({ _id: postId, isDeleted: false }).populate(
    POST_POPULATE
  );
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }
  return post;
};

/** Author only — see assertCanEdit. */
const updatePostData = async (
  postId: string,
  postData: Partial<IPost>,
  actor: TActor
) => {
  const post = await getPostOr404(postId);
  assertCanEdit(post, actor);

  const updated = await PostModel.findByIdAndUpdate(
    postId,
    { $set: postData },
    { new: true, runValidators: true }
  ).populate(POST_POPULATE);

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update post");
  }
  return updated;
};

/** Author or admin. Soft delete, so comment threads stay resolvable. */
const softDeletePostInDB = async (postId: string, actor: TActor) => {
  const post = await getPostOr404(postId);
  assertCanDelete(post, actor);

  return PostModel.findByIdAndUpdate(postId, { isDeleted: true }, { new: true });
};

/**
 * Sets or switches a reaction in one atomic update: the chosen list gains the
 * user, the opposite list loses them. $addToSet is idempotent, so repeating
 * the same call cannot register a second vote and no read-then-write race
 * exists.
 */
const setPostReactionInDB = async (
  postId: string,
  reaction: TReactionType,
  actor: TActor
) => {
  await getPostOr404(postId);

  const add = reaction === "like" ? "reactions.likes" : "reactions.dislikes";
  const remove = reaction === "like" ? "reactions.dislikes" : "reactions.likes";

  const updated = await PostModel.findByIdAndUpdate(
    postId,
    {
      $addToSet: { [add]: actor.userId },
      $pull: { [remove]: actor.userId },
    },
    { new: true }
  ).populate(POST_POPULATE);

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to react to post");
  }
  return updated;
};

/** Clears whichever reaction the caller holds; a no-op if they had none. */
const removePostReactionFromDB = async (postId: string, actor: TActor) => {
  await getPostOr404(postId);

  const updated = await PostModel.findByIdAndUpdate(
    postId,
    {
      $pull: {
        "reactions.likes": actor.userId,
        "reactions.dislikes": actor.userId,
      },
    },
    { new: true }
  ).populate(POST_POPULATE);

  if (!updated) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to remove reaction"
    );
  }
  return updated;
};

const addCommentIntoPost = async (
  postId: string,
  commentData: Pick<TComment, "commentText">,
  actor: TActor
) => {
  await getPostOr404(postId);

  const updated = await PostModel.findByIdAndUpdate(
    postId,
    {
      $push: {
        comments: {
          commenterId: actor.userId,
          commenterRole: actor.role,
          commentText: commentData.commentText,
        },
      },
    },
    { new: true, runValidators: true }
  ).populate(POST_POPULATE);

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add comment");
  }
  return updated;
};

export const postServices = {
  createPostIntoDB,
  getAllPostsFromDB,
  getPostByIdFromDB,
  updatePostData,
  softDeletePostInDB,
  setPostReactionInDB,
  removePostReactionFromDB,
  addCommentIntoPost,
};
