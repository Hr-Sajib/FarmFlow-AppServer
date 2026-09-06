import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { IPost, TComment, TReactionType } from "./post.interface";
import { PostModel } from "./post.model";
import { reviewPost } from "./post.moderation";
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
    fieldSnapshot: postData.fieldSnapshot,
    // Author and role come from the token, never the body.
    creatorId: actor.userId,
    creatorRole: actor.role,
  });

  // Reviewed after the write, not before it: the author's post is saved
  // whatever the model does, and the review only decides who else can see it.
  void reviewPost(created._id.toString());

  return created.populate(POST_POPULATE);
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

/**
 * One page of the feed.
 *
 * Paged by a cursor rather than by skip: the feed is ordered newest first and
 * grows at the head, so an offset shifts under the reader between requests and
 * duplicates or drops a post. `createdAt` alone is not unique enough at second
 * resolution, so the cursor is the pair (createdAt, _id).
 *
 * Visibility is applied here rather than in the controller because it is the
 * one rule the whole feed depends on: a post that has not passed review is
 * visible to its author and to an admin, and to nobody else.
 */
const getAllPostsFromDB = async (
  filters: {
    topics?: string[];
    region?: string;
    creatorId?: string;
    searchTerm?: string;
    cursor?: string;
    limit?: number;
  },
  actor: TActor
) => {
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const query: Record<string, unknown> = { isDeleted: false };

  if (filters.topics?.length) query.postTopics = { $all: filters.topics };
  if (filters.region) query.region = filters.region;
  if (filters.creatorId) query.creatorId = filters.creatorId;

  if (actor.role !== "admin") {
    query.$or = [{ isPassedByAI: true }, { creatorId: actor.userId }];
  }

  if (filters.searchTerm) {
    // Escaped: a searching farmer types "(" as a bracket, not as a group.
    const safe = filters.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const term = new RegExp(safe, "i");
    const textMatch = { $or: [{ postText: term }, { postTopics: term }] };
    query.$and = [...((query.$and as unknown[]) ?? []), textMatch];
  }

  if (filters.cursor) {
    const [ts, id] = filters.cursor.split("_");
    const at = new Date(ts);
    if (!Number.isNaN(at.getTime())) {
      const before = {
        $or: [{ createdAt: { $lt: at } }, { createdAt: at, _id: { $lt: id } }],
      };
      query.$and = [...((query.$and as unknown[]) ?? []), before];
    }
  }

  // One more than asked for, so "is there another page" needs no second query.
  const rows = await PostModel.find(query)
    .populate(POST_POPULATE)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const posts = hasMore ? rows.slice(0, limit) : rows;
  const last = posts[posts.length - 1];

  return {
    posts,
    hasMore,
    nextCursor:
      hasMore && last?.createdAt
        ? `${last.createdAt.toISOString()}_${last._id}`
        : null,
  };
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

/**
 * An admin's decision on a post the automated review got wrong.
 *
 * Kept separate from updatePostData, which is author-only and about content:
 * this changes who can see a post, not what it says, and only an admin may do
 * it. Recorded the same way the model's own verdict is, so nothing downstream
 * has to know which of the two decided.
 */
const setPostReviewInDB = async (
  postId: string,
  passed: boolean,
  note?: string
) => {
  const updated = await PostModel.findOneAndUpdate(
    { _id: postId, isDeleted: false },
    {
      isPassedByAI: passed,
      reviewNote: passed ? undefined : (note ?? "Held back by a moderator."),
      reviewedAt: new Date(),
    },
    { new: true }
  ).populate(POST_POPULATE);

  if (!updated) throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  return updated;
};

export const postServices = {
  setPostReviewInDB,
  createPostIntoDB,
  getAllPostsFromDB,
  getPostByIdFromDB,
  updatePostData,
  softDeletePostInDB,
  setPostReactionInDB,
  removePostReactionFromDB,
  addCommentIntoPost,
};
