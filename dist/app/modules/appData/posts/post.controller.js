"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postController = exports.generateStaticPdfController = void 0;
const catchAsync_1 = __importDefault(require("../../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../utils/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const post_service_1 = require("./post.service");
const AppError_1 = __importDefault(require("../../../errors/AppError"));
const pdfCreate_1 = require("../../../utils/pdfCreate");
// Create a new post
const createPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postData = req.body;
    const userPhone = req.user.userPhone;
    const newPost = yield post_service_1.postServices.createPost(postData, userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Post created successfully",
        data: newPost,
    });
}));
// Update an existing post
const updatePost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const postData = req.body;
    const userPhone = req.user.userPhone;
    const role = req.user.role;
    const updatedPost = yield post_service_1.postServices.updatePost(postId, postData, userPhone, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Post updated successfully",
        data: updatedPost,
    });
}));
// Delete a post
const deletePost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userPhone = req.user.userPhone;
    const role = req.user.role;
    yield post_service_1.postServices.deletePost(postId, userPhone, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Post deleted successfully",
        data: null,
    });
}));
// Add a comment to a post
const addComment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const commentData = req.body;
    const userPhone = req.user.userPhone;
    const updatedPost = yield post_service_1.postServices.addComment(postId, userPhone, commentData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Comment added successfully",
        data: updatedPost,
    });
}));
// Like a post
const likePost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userPhone = req.user.userPhone;
    const updatedPost = yield post_service_1.postServices.likePost(postId, userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Post liked successfully",
        data: updatedPost,
    });
}));
// Dislike a post
const dislikePost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userPhone = req.user.userPhone;
    const updatedPost = yield post_service_1.postServices.dislikePost(postId, userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Post disliked successfully",
        data: updatedPost,
    });
}));
// Remove a like from a post
const removeLikeFromPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userPhone = req.user.userPhone;
    const updatedPost = yield post_service_1.postServices.removeLikeFromPost(postId, userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Like removed successfully",
        data: updatedPost,
    });
}));
// Remove a dislike from a post
const removeDislikeFromPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userPhone = req.user.userPhone;
    const updatedPost = yield post_service_1.postServices.removeDislikeFromPost(postId, userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Dislike removed successfully",
        data: updatedPost,
    });
}));
// Get all posts
const getAllPosts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const posts = yield post_service_1.postServices.getAllPostsFromDB();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Posts retrieved successfully",
        data: posts,
    });
}));
// Get a single post by ID
const getPostById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const post = yield post_service_1.postServices.getPostByIdFromDB(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Post retrieved successfully",
        data: post,
    });
}));
exports.generateStaticPdfController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const pdfBuffer = yield (0, pdfCreate_1.generateStaticPdf)();
    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=farmflow-static-report.pdf",
    });
    res.status(http_status_1.default.OK).send(pdfBuffer);
}));
// Export posts and users as XLSX in a single controller
// export const exportPostsXlsx = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   // 1️⃣ Fetch posts with populated creator and commenter
//   const posts = await PostModel.find()
//     .populate("creatorId", "name phone role")
//     .populate("comments.commenterId", "name phone role")
//     .lean();
//   const users = await UserModel.find().lean();
//   console.log("Posts:", posts);
//   console.log("Users:", users);
//   // 2️⃣ Shape posts for cleaner export (optional)
//   const postData = posts.map(post => ({
//     Title: post.title,
//     Content: post.content,
//     CreatorName: post.creatorId?.name || "N/A",
//     CreatorPhone: post.creatorId?.phone || "N/A",
//     CreatorRole: post.creatorId?.role || "N/A",
//     CreatedAt: post.createdAt?.toISOString() || "N/A",
//   }));
//   // 3️⃣ Shape users for cleaner export
//   const userData = users.map(user => ({
//     Name: user.name,
//     FarmerID: user.farmerId,
//     Email: user.email || "N/A",
//     Phone: user.phone,
//     Role: user.role,
//     Status: user.status,
//     Address: user.address,
//   }));
//   // 4️⃣ Validate data before generating XLSX
//   if (postData.length === 0 && userData.length === 0) {
//     return next({
//       status: 404,
//       message: "No posts or users data available for export",
//     });
//   }
//   // 5️⃣ Generate XLSX buffer with multiple sheets
//   const xlsxBuffer = jsonMultiToXlsxBuffer([
//     {
//       data: postData,
//       sheetName: "PostsReport",
//       headers: ["Title", "Content", "CreatorName", "CreatorPhone", "CreatorRole", "CreatedAt"],
//     },
//     {
//       data: userData,
//       sheetName: "UsersReport",
//       headers: ["Name", "FarmerID", "Email", "Phone", "Role", "Status", "Address"],
//     },
//   ]);
//   // 6️⃣ Send XLSX as download
//   res.set({
//     "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     "Content-Disposition": "attachment; filename=farmflow_report.xlsx",
//   });
//   res.send(xlsxBuffer); // Removed return to align with RequestHandler
// });
exports.postController = {
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
    generateStaticPdfController: exports.generateStaticPdfController,
    // exportPostsXlsx
};
