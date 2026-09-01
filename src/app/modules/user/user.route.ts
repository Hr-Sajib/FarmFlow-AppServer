import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { userController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

// Public registration. The schema restricts role to farmer or expert and
// rejects status/userCode/expertStatus outright.
router.post(
  "/register",
  validateRequest(UserValidation.createUserValidationSchema),
  userController.createUser
);

router.get("/me", auth("admin", "farmer", "expert"), userController.getMe);

// Declared before "/:userId" so it is not read as an id.
router.get(
  "/experts",
  auth("admin", "farmer", "expert"),
  userController.getVerifiedExperts
);

router.get("/", auth("admin"), userController.getAllUsers);

router.get("/:userId", auth("admin"), userController.getUserById);

/**
 * Covers profile edits, admin role changes and admin block/unblock — there is
 * no separate toggle-status endpoint. Ownership and the per-role field
 * allowlist are enforced in the controller.
 */
router.patch(
  "/:userId",
  auth("admin", "farmer", "expert"),
  validateRequest(UserValidation.updateUserValidationSchema),
  userController.updateUser
);

router.delete("/:userId", auth("admin"), userController.softDeleteUser);

export const UserRoutes = router;
