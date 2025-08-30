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
exports.postServices = void 0;
const AppError_1 = __importDefault(require("../../../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const post_model_1 = require("./post.model");
const user_model_1 = require("../user/user.model");
const createPost = (postData, userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    const post = {
        creatorName: user.name,
        creatorPhoto: user.photo,
        creatorId: user._id,
        postText: postData.postText,
        postImage: postData.postImage,
        postTopics: postData.postTopics
    };
    const newPost = yield post_model_1.PostModel.create(post);
    return newPost;
});
const updatePost = (postId, postData, userPhone, role) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found");
    }
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    if (role !== "admin" && !post.creatorId.equals(user._id)) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: You can only update your own posts");
    }
    const updateData = {
        postText: postData.postText,
        postImage: postData.postImage
    };
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, updateData, {
        new: true
    });
    return updatedPost;
});
const deletePost = (postId, userPhone, role) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found");
    }
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    if (role !== "admin" && !post.creatorId.equals(user._id)) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: You can only delete your own posts");
    }
    yield post_model_1.PostModel.findByIdAndDelete(postId);
});
const addComment = (postId, userPhone, commentData) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    // Find the user by commenterId and ensure not deleted
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    const commentInput = {
        commenterName: user.name,
        commenterId: user._id,
        commentText: commentData.commentText,
    };
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, { $push: { comments: commentInput } }, { new: true });
    if (!updatedPost) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to add comment!");
    }
    return updatedPost;
});
const likePost = (postId, userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    // Find the post and ensure it exists
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    // Check if user has already liked the post
    if (post.reactions.likes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already liked this post!");
    }
    if (post.reactions.dislikes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already disliked this post!");
    }
    // Update likes count and add user ID to likes.by
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, {
        $inc: { "reactions.likes.count": 1 },
        $addToSet: { "reactions.likes.by": user._id },
    }, { new: true });
    if (!updatedPost) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to like post!");
    }
    return updatedPost;
});
const dislikePost = (postId, userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    // Check if user has already liked the post
    if (post.reactions.dislikes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already disliked this post!");
    }
    if (post.reactions.likes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already liked this post!");
    }
    // Update likes count and add user ID to likes.by
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, {
        $inc: { "reactions.dislikes.count": 1 },
        $addToSet: { "reactions.dislikes.by": user._id },
    }, { new: true });
    if (!updatedPost) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to dislike post!");
    }
    return updatedPost;
});
const removeLikeFromPost = (postId, userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    if (!post.reactions.likes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You have not liked this post!");
    }
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, {
        $inc: { "reactions.likes.count": -1 },
        $pull: { "reactions.likes.by": user._id },
    }, { new: true });
    if (!updatedPost) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to remove like from post!");
    }
    return updatedPost;
});
const removeDislikeFromPost = (postId, userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    const post = yield post_model_1.PostModel.findById(postId);
    if (!post) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Post not found!");
    }
    if (!post.reactions.dislikes.by.includes(user._id)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You have not disliked this post!");
    }
    const updatedPost = yield post_model_1.PostModel.findByIdAndUpdate(postId, {
        $inc: { "reactions.dislikes.count": -1 },
        $pull: { "reactions.dislikes.by": user._id },
    }, { new: true });
    if (!updatedPost) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to remove dislike from post!");
    }
    return updatedPost;
});
const getAllPostsFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const posts = yield post_model_1.PostModel.find()
        .populate("creatorId", "name phone role")
        .populate("comments.commenterId", "name phone role");
    return posts;
});
const getPostByIdFromDB = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield post_model_1.PostModel.findById(postId)
        .populate("creatorId", "name phone role")
        .populate("comments.commenterId", "name phone role");
    return post;
});
exports.postServices = {
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
