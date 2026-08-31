import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { postServices } from "./post.service";
import { TActor } from "./post.utils";

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
  const { topic, region, creatorId } = req.query as {
    topic?: string;
    region?: string;
    creatorId?: string;
  };
  const posts = await postServices.getAllPostsFromDB({ topic, region, creatorId });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: posts,
  });
});

const getPostById = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.getPostByIdFromDB(req.params.postId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post retrieved successfully",
    data: post,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const post = await postServices.updatePostData(
    req.params.postId,
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
    req.params.postId,
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
    req.params.postId,
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
    req.params.postId,
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
    req.params.postId,
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

export const postController = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  softDeletePost,
  setPostReaction,
  removePostReaction,
  addComment,
};
