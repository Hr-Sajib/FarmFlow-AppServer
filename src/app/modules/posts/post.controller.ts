import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { postServices } from "./post.service";
import { TActor } from "./post.utils";
import { routeParam } from "../../utils/routeParam";

const actorOf = (req: Request): TActor => ({
  userId: req.user.userId,
  role: req.user.role,
  userCode: req.user.userCode,
});

const createPost = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.createPostIntoDB(req.body, actorOf(req));
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Post created successfully",
    data: post,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const { topic, topics, region, creatorId, searchTerm, cursor, limit } =
    req.query as Record<string, string | undefined>;

  // `topic` stays accepted so existing links keep working; `topics` is the
  // comma-separated form the tag filter sends.
  const selected = (topics ?? topic ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const posts = await postServices.getAllPostsFromDB(
    {
      topics: selected,
      region,
      creatorId,
      searchTerm,
      cursor,
      limit: limit ? Number(limit) : undefined,
    },
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: posts,
  });
});

const getPostById = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.getPostByIdFromDB(routeParam(req, "postId"));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post retrieved successfully",
    data: post,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.updatePostData(
    routeParam(req, "postId"),
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post updated successfully",
    data: post,
  });
});

const softDeletePost = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.softDeletePostInDB(
    routeParam(req, "postId"),
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post deleted successfully",
    data: post,
  });
});

const setPostReaction = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.setPostReactionInDB(
    routeParam(req, "postId"),
    req.body.reaction,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Post ${req.body.reaction}d`,
    data: post,
  });
});

const removePostReaction = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.removePostReactionFromDB(
    routeParam(req, "postId"),
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reaction removed",
    data: post,
  });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.addCommentIntoPost(
    routeParam(req, "postId"),
    req.body,
    actorOf(req)
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Comment added successfully",
    data: post,
  });
});

const setPostReview = catchAsync(async (req: Request, res: Response) => {
  const { isPassedByAI, reviewNote } = req.body as {
    isPassedByAI: boolean;
    reviewNote?: string;
  };
  const post = await postServices.setPostReviewInDB(
    routeParam(req, "postId"),
    isPassedByAI,
    reviewNote
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: isPassedByAI ? "Post published" : "Post held back",
    data: post,
  });
});

export const postController = {
  setPostReview,
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  softDeletePost,
  setPostReaction,
  removePostReaction,
  addComment,
};
