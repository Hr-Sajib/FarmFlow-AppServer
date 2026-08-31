import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IPost, TComment } from "./post.interface";
import { PostModel } from "./post.model";
import { UserModel } from "../user/user.model";

const createPost = async (postData: IPost, userId: string) => {
  
  const user = await UserModel.findOne({ _id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const post = {
    creatorId: user._id,
    creatorRole: user.role,
    postText: postData.postText,
    postImage: postData.postImage,
    postTopics: postData.postTopics,
    region: postData.region,
  }


  const newPost = await PostModel.create(post);
  return newPost;
};

const updatePost = async (
  postId: string,
  postData: Partial<IPost>,
  userId: string,
  role: string
) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ _id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (role !== "admin" && !post.creatorId.equals(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only update your own posts");
  }

  const updateData = {
    postText: postData.postText,
    postImage: postData.postImage
  }

  const updatedPost = await PostModel.findByIdAndUpdate(postId, updateData, {
    new: true
  });
  return updatedPost;
};

const deletePost = async (postId: string, userId: string, role: string) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  const user = await UserModel.findOne({ _id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (role !== "admin" && !post.creatorId.equals(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own posts");
  }

  await PostModel.findByIdAndDelete(postId);
};

const addComment = async (postId: string,userId: string, commentData:TComment) => {

  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }

  // Find the user by commenterId and ensure not deleted
  const user = await UserModel.findOne({ _id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const commentInput = {
    commenterId: user._id,
    commenterRole: user.role,
    commentText: commentData.commentText,
  }


  const updatedPost = await PostModel.findByIdAndUpdate(
    postId,
    { $push: { comments: commentInput } },
    { new: true }
  );

  if (!updatedPost) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add comment!");
  }

  return updatedPost;
};


const likePost = async (postId: string, userId: string) => {

  const user = await UserModel.findOne({ _id: userId }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Find the post and ensure it exists
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }

  // Check if user has already liked the post
  if (post.reactions.likes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You already liked this post!");
  }
  if (post.reactions.dislikes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You already disliked this post!");
  }

  // Update likes count and add user ID to likes.by
  const updatedPost = await PostModel.findByIdAndUpdate(
    postId,
    {
      $inc: { "reactions.likes.count": 1 },
      $addToSet: { "reactions.likes.by": user._id },
    },
    { new: true }
  );

  if (!updatedPost) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to like post!");
  }

  return updatedPost;
};

const dislikePost = async (postId: string, userId: string) => {
  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }
  
  const user = await UserModel.findOne({ _id: userId }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Check if user has already liked the post
  if (post.reactions.dislikes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You already disliked this post!");
  }
  if (post.reactions.likes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You already liked this post!");
  }

  // Update likes count and add user ID to likes.by
  const updatedPost = await PostModel.findByIdAndUpdate(
    postId,
    {
      $inc: { "reactions.dislikes.count": 1 },
      $addToSet: { "reactions.dislikes.by": user._id },
    },
    { new: true }
  );

  if (!updatedPost) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to dislike post!");
  }

  return updatedPost;
};

const removeLikeFromPost = async (postId: string, userId: string) => {
  const user = await UserModel.findOne({ _id: userId }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }

  if (!post.reactions.likes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You have not liked this post!");
  }

  const updatedPost = await PostModel.findByIdAndUpdate(
    postId,
    {
      $inc: { "reactions.likes.count": -1 },
      $pull: { "reactions.likes.by": user._id },
    },
    { new: true }
  );

  if (!updatedPost) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to remove like from post!");
  }

  return updatedPost;
};

const removeDislikeFromPost = async (postId: string, userId: string) => {
  const user = await UserModel.findOne({ _id: userId }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const post = await PostModel.findById(postId);
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found!");
  }

  if (!post.reactions.dislikes.by.includes(user._id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "You have not disliked this post!");
  }

  const updatedPost = await PostModel.findByIdAndUpdate(
    postId,
    {
      $inc: { "reactions.dislikes.count": -1 },
      $pull: { "reactions.dislikes.by": user._id },
    },
    { new: true }
  );

  if (!updatedPost) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to remove dislike from post!");
  }

  return updatedPost;
};

const getAllPostsFromDB = async () => {
  const posts = await PostModel.find()
    .populate("creatorId", "fullName photo role")
    .populate("comments.commenterId", "fullName photo role");
  return posts;
};

const getPostByIdFromDB = async (postId: string) => {
  const post = await PostModel.findById(postId)
    .populate("creatorId", "fullName photo role")
    .populate("comments.commenterId", "fullName photo role");
  return post;
};



export const postServices = {
  createPost,
  updatePost,
  deletePost,
  addComment,
  likePost,
  dislikePost,
  getAllPostsFromDB,
  getPostByIdFromDB,
  removeDislikeFromPost,
  removeLikeFromPost
};