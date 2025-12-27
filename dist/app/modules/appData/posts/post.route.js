"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../../middlewares/auth"));
const post_controller_1 = require("./post.controller");
const validateRequest_1 = __importDefault(require("../../../middlewares/validateRequest"));
const post_validation_1 = require("./post.validation");
const router = express_1.default.Router();
// Create a post
router.post("/", (0, auth_1.default)("admin", "farmer"), (0, validateRequest_1.default)(post_validation_1.PostValidation.createPostValidationSchema), post_controller_1.postController.createPost);
// Update a post
router.patch("/:postId", (0, auth_1.default)("admin", "farmer"), (0, validateRequest_1.default)(post_validation_1.PostValidation.updatePostValidationSchema), post_controller_1.postController.updatePost);
// Delete a post
router.delete("/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.deletePost);
// Add a comment to a post
router.post("/comment/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.addComment);
// Like a post
router.post("/like/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.likePost);
router.post("/removeLike/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.removeLikeFromPost);
// Dislike a post
router.post("/dislike/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.dislikePost);
router.post("/removeDislike/:postId", (0, auth_1.default)("admin", "farmer"), post_controller_1.postController.removeDislikeFromPost);
// Read all posts
router.get("/", 
// auth("admin", "farmer"), 
post_controller_1.postController.getAllPosts);
exports.PostRoutes = router;
