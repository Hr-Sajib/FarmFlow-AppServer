import { userController } from "./user.controller";
import express from 'express';

const router = express.Router();

router.post(
  '/register',
  userController.createUser,
);

router.patch("/:userId/toggle-status",userController.toggleUserStatus);
router.patch('/update-password', userController.updatePassword);


export const UserRoutes = router;