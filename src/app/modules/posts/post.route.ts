import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { postController } from "./post.controller";
import { PostValidation } from "./post.validation";

const router = express.Router();

// The forum is open to every signed-in role.
const anyRole = auth("admin", "farmer", "expert");

router.get("/", anyRole, postController.getAllPosts);

// Previously the controller and service existed with no route registered, so
// fetching a single post was unreachable.
router.get("/:postId", anyRole, postController.getPostById);

router.post(
  "/",
  anyRole,
  validateRequest(PostValidation.createPostValidationSchema),
  postController.createPost
);

// Author only — an admin can remove a post but not rewrite it.
router.patch(
  "/:postId",
  anyRole,
  validateRequest(PostValidation.updatePostValidationSchema),
  postController.updatePost
);

// Author or admin.
router.delete("/:postId", anyRole, postController.softDeletePost);

// Set or switch a reaction; DELETE clears it.
router.post(
  "/:postId/react",
  anyRole,
  validateRequest(PostValidation.reactToPostValidationSchema),
  postController.setPostReaction
);
router.delete("/:postId/react", anyRole, postController.removePostReaction);

router.post(
  "/:postId/comment",
  anyRole,
  validateRequest(PostValidation.createCommentValidationSchema),
  postController.addComment
);

export const PostRoutes = router;
