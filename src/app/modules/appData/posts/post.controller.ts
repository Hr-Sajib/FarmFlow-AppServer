import { NextFunction, Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { postServices } from "./post.service";
import { PostValidation } from "./post.validation";
import AppError from "../../../errors/AppError";
import { generateStaticPdf } from "../../../utils/pdfCreate";
import { PostModel } from "./post.model";
import { jsonMultiToXlsxBuffer, jsonToXlsxBuffer } from "../../../utils/jsonToXlsx";
import { UserModel } from "../user/user.model";

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



export const generateStaticPdfController = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await generateStaticPdf();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=farmflow-static-report.pdf",
  });

  res.status(httpStatus.OK).send(pdfBuffer);
});



// Export posts and users as XLSX in a single controller

export const exportPostsXlsx = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1️⃣ Fetch posts with populated creator and commenter
  const posts = await PostModel.find()
    .populate("creatorId", "name phone role")
    .populate("comments.commenterId", "name phone role")
    .lean();

  const users = await UserModel.find().lean();

  console.log("Posts:", posts);
  console.log("Users:", users);

  // 2️⃣ Shape posts for cleaner export (optional)
  const postData = posts.map(post => ({
    Title: post.title,
    Content: post.content,
    CreatorName: post.creatorId?.name || "N/A",
    CreatorPhone: post.creatorId?.phone || "N/A",
    CreatorRole: post.creatorId?.role || "N/A",
    CreatedAt: post.createdAt?.toISOString() || "N/A",
  }));

  // 3️⃣ Shape users for cleaner export
  const userData = users.map(user => ({
    Name: user.name,
    FarmerID: user.farmerId,
    Email: user.email || "N/A",
    Phone: user.phone,
    Role: user.role,
    Status: user.status,
    Address: user.address,
  }));

  // 4️⃣ Validate data before generating XLSX
  if (postData.length === 0 && userData.length === 0) {
    return next({
      status: 404,
      message: "No posts or users data available for export",
    });
  }

  // 5️⃣ Generate XLSX buffer with multiple sheets
  const xlsxBuffer = jsonMultiToXlsxBuffer([
    {
      data: postData,
      sheetName: "PostsReport",
      headers: ["Title", "Content", "CreatorName", "CreatorPhone", "CreatorRole", "CreatedAt"],
    },
    {
      data: userData,
      sheetName: "UsersReport",
      headers: ["Name", "FarmerID", "Email", "Phone", "Role", "Status", "Address"],
    },
  ]);

  // 6️⃣ Send XLSX as download
  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=farmflow_report.xlsx",
  });
  res.send(xlsxBuffer); // Removed return to align with RequestHandler
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
  removeLikeFromPost,
  generateStaticPdfController,
  exportPostsXlsx
};