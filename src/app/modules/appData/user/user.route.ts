import auth from "../../../middlewares/auth";
import { userController } from "./user.controller";
import express from 'express';

const router = express.Router();

router.post(
  '/register',
  userController.createUser,
);

router.patch("/toggle-status/:userId", auth("admin"), userController.toggleUserStatus);
router.patch('/update-password/:userId', auth("admin","farmer"), userController.updatePassword);
router.patch('/:userId', auth("admin", "farmer"), userController.updateUser);
router.delete('/deleteField/:userId', auth("admin","farmer"), userController.deleteFieldFromUser);
router.post('/addField/:userId', auth("admin","farmer"), userController.addFieldToUser);
router.patch('/updateField/:userId/:fieldId', auth("admin","farmer"), userController.updateField);

export const UserRoutes = router;