import auth from "../../../middlewares/auth";
import { userController } from "./user.controller";
import express from "express";

const router = express.Router();

router.post("/register", userController.createUser);

router.get(
  "/",
  auth("admin"),
  userController.getAllUsers
);

router.get(
  "/:userId",
  auth("admin"),
  userController.getUserById
);
router.patch(
  "/toggle-status/:userId",
  auth("admin"),
  userController.toggleUserStatus
);
router.patch(
  "/update-password/:userId",
  auth("admin", "farmer"),
  userController.updatePassword
);
router.patch("/:userId", 
  auth("admin", "farmer"), 
  userController.updateUser);

router.delete("/:userId", 
  auth("admin"), 
  userController.softDeleteUser);

export const UserRoutes = router;
