import { Types } from "mongoose";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IPost, TComment } from "./post.interface";
import { PostModel } from "./post.model";
import { UserModel } from "../user/user.model";

const createPost = async (postData: IPost, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  postData.creatorId = user._id;

  const newPost = await PostModel.create(postData);
  return newPost;
};

const updatePost = async (
  postId: string,
  postData: Partial<IPost>,
  userPhone: string,
  role: string
) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (role !== "admin" && !post.creatorId.equals(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only update your own posts");
  }

  const updatedPost = await PostModel.findByIdAndUpdate(postId, postData, {
    new: true,
    runValidators: true,
  });
  return updatedPost;
};

const deletePost = async (postId: string, userPhone: string, role: string) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (role !== "admin" && !post.creatorId.equals(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own posts");
  }

  await PostModel.findByIdAndDelete(postId);
};

const addComment = async (
  postId: string,
  commentData: TComment,
  userPhone: string,
  role: string
) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  commentData.commenterId = user._id;

  post.comments.push(commentData);
  await post.save();
  return post;
};

const likePost = async (postId: string, userPhone: string, role: string) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  post.reactions.likes += 1;
  await post.save();
  return post;
};

const dislikePost = async (postId: string, userPhone: string, role: string) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  post.reactions.dislikes += 1;
  await post.save();
  return post;
};

const getAllPosts = async () => {
  const posts = await PostModel.find()
    .populate("creatorId", "name phone role")
    .populate("comments.commenterId", "name phone role");
  return posts;
};

const deleteComment = async (
  postId: string,
  commentId: string,
  userPhone: string,
  role: string
) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ phone: userPhone });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const commentIndex = post.comments.findIndex(
    (comment: TComment) => comment._id?.toString() === commentId // Updated to handle optional _id
  );
  if (commentIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
  }

  const comment = post.comments[commentIndex];
  if (role !== "admin" && !comment.commenterId.equals(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own comments");
  }

  post.comments.splice(commentIndex, 1);
  await post.save();
  return post;
};

export const postServices = {
  createPost,
  updatePost,
  deletePost,
  addComment,
  likePost,
  dislikePost,
  getAllPosts,
  deleteComment,
};