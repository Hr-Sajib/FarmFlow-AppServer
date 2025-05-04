import auth from "../../../middlewares/auth";
import { userController } from "./user.controller";
import express from 'express';

const router = express.Router();

router.post(
  '/register',
  userController.createUser,
);

router.patch("/:userId/toggle-status", auth("admin"), userController.toggleUserStatus);
router.patch('/update-password', auth("admin","farmer"), userController.updatePassword);
router.patch('/', auth("admin", "farmer"), userController.updateUser);
router.delete('/field', auth("admin","farmer"), userController.deleteFieldFromUser);
router.delete('/addField', auth("admin","farmer"), userController.addFieldToUser);

export const UserRoutes = router;