import express from "express";

import auth from "../../middlewares/auth";
import { followController } from "./follow.controller";

const router = express.Router();
const anyRole = auth("admin", "farmer", "expert");

// Public to anyone signed in: a community is not browsable if its people are not.
router.get("/:userCode/profile", anyRole, followController.getPublicProfile);
router.post("/:userCode/follow", anyRole, followController.follow);
router.delete("/:userCode/follow", anyRole, followController.unfollow);

export const FollowRoutes = router;
