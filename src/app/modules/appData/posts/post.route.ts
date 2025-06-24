import express from "express";
import auth from "../../../middlewares/auth";
import { postController } from "./post.controller";
import validateRequest from "../../../middlewares/validateRequest";
import { createPostValidationSchema, updatePostValidationSchema } from "./post.validation";

const router = express.Router();

// Create a post
router.post(
  "/create",
  auth("admin", "farmer"),
  validateRequest(createPostValidationSchema),
  postController.createPost
);

// Update a post
router.patch(
  "/:postId",
  auth("admin", "farmer"),
  validateRequest(updatePostValidationSchema),
  postController.updatePost
);

// Delete a post
router.delete("/:postId", auth("admin", "farmer"), postController.deletePost);

// Add a comment to a post
router.post("/:postId/comment", auth("admin", "farmer"), postController.addComment);

// Like a post
router.post("/:postId/like", auth("admin", "farmer"), postController.likePost);

// Dislike a post
router.post("/:postId/dislike", auth("admin", "farmer"), postController.dislikePost);

// Read all posts
router.get("/", auth("admin", "farmer"), postController.getAllPosts);

// Delete a comment from a post
router.delete("/:postId/comment/:commentId", auth("admin", "farmer"), postController.deleteComment);

export const PostRoutes = router;