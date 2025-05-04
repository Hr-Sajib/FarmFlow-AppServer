import { userController } from "./user.controller";
import express from 'express';

const router = express.Router();

router.post(
  '/register',
  userController.createUser,
);

router.patch("/:userId/toggle-status",userController.toggleUserStatus);
router.patch('/update-password', userController.updatePassword);
router.patch('/', userController.updateUser);
router.delete('/field', userController.deleteFieldFromUser);

export const UserRoutes = router;