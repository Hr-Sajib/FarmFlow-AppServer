import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { postServices } from "./post.service";
import AppError from "../../../errors/AppError";

const createPost = catchAsync(async (req: Request, res: Response) => {
  const postData = req.body;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const newPost = await postServices.createPost(postData, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Post created successfully",
    data: newPost,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const postData = req.body;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedPost = await postServices.updatePost(postId, postData, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post updated successfully",
    data: updatedPost,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  await postServices.deletePost(postId, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post deleted successfully",
    data: null,
  });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const commentData = req.body;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedPost = await postServices.addComment(postId, commentData, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment added successfully",
    data: updatedPost,
  });
});

const likePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedPost = await postServices.likePost(postId, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post liked successfully",
    data: updatedPost,
  });
});

const dislikePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedPost = await postServices.dislikePost(postId, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post disliked successfully",
    data: updatedPost,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const posts = await postServices.getAllPosts();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: posts,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const userPhone = req.user.userPhone;
  const role = req.user.role;

  const updatedPost = await postServices.deleteComment(postId, commentId, userPhone, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment deleted successfully",
    data: updatedPost,
  });
});

export const postController = {
  createPost,
  updatePost,
  deletePost,
  addComment,
  likePost,
  dislikePost,
  getAllPosts,
  deleteComment,
};