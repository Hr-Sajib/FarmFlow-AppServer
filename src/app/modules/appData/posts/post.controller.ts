import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { postServices } from "./post.service";
import { PostValidation } from "./post.validation";
import AppError from "../../../errors/AppError";

// Create a new post
const createPost = catchAsync(async (req: Request, res: Response) => {

  const postData = req.body;
  const userPhone = req.user.userPhone;

  const newPost = await postServices.createPost(postData, userPhone);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Post created successfully",
    data: newPost,
  });
});

// Update an existing post
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

// Delete a post
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

// Add a comment to a post
const addComment = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const commentData = req.body;
  const userPhone = req.user.userPhone;


  const updatedPost = await postServices.addComment(postId, userPhone, commentData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment added successfully",
    data: updatedPost,
  });
});

// Like a post
const likePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;

  const updatedPost = await postServices.likePost(postId, userPhone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post liked successfully",
    data: updatedPost,
  });
});

// Dislike a post
const dislikePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;

  const updatedPost = await postServices.dislikePost(postId, userPhone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post disliked successfully",
    data: updatedPost,
  });
});

// Remove a like from a post
const removeLikeFromPost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;

  const updatedPost = await postServices.removeLikeFromPost(postId, userPhone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Like removed successfully",
    data: updatedPost,
  });
});

// Remove a dislike from a post
const removeDislikeFromPost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userPhone = req.user.userPhone;

  const updatedPost = await postServices.removeDislikeFromPost(postId, userPhone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dislike removed successfully",
    data: updatedPost,
  });
});
// Get all posts
const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const posts = await postServices.getAllPostsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: posts,
  });
});

// Get a single post by ID
const getPostById = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;

  const post = await postServices.getPostByIdFromDB(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post retrieved successfully",
    data: post,
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
  getPostById,
  removeDislikeFromPost,
  removeLikeFromPost
};