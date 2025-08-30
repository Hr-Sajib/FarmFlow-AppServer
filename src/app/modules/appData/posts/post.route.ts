import express from "express";
import auth from "../../../middlewares/auth";
import { generateStaticPdfController, postController } from "./post.controller";
import validateRequest from "../../../middlewares/validateRequest";
import { PostValidation } from "./post.validation";

const router = express.Router();

// Create a post
router.post(
  "/",
  auth("admin", "farmer"),
  validateRequest(PostValidation.createPostValidationSchema),
  postController.createPost
);

// Update a post
router.patch(
  "/:postId",
  auth("admin", "farmer"),
  validateRequest(PostValidation.updatePostValidationSchema),
  postController.updatePost
);

// Delete a post
router.delete("/:postId", auth("admin", "farmer"), postController.deletePost);

// Add a comment to a post
router.post("/comment/:postId", auth("admin", "farmer"), postController.addComment);

// Like a post
router.post("/like/:postId", auth("admin", "farmer"), postController.likePost);
router.post("/removeLike/:postId", auth("admin", "farmer"), postController.removeLikeFromPost);

// Dislike a post
router.post("/dislike/:postId", auth("admin", "farmer"), postController.dislikePost);
router.post("/removeDislike/:postId", auth("admin", "farmer"), postController.removeDislikeFromPost);

// Read all posts
router.get("/", 
  // auth("admin", "farmer"), 
  postController.getAllPosts);



export const PostRoutes = router;