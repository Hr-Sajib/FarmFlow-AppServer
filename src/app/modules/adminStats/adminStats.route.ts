import express from "express";

import auth from "../../middlewares/auth";
import { adminStatsController } from "./adminStats.controller";

const router = express.Router();

/** Platform-wide counts across every module — admins only. */
router.get("/overview", auth("admin"), adminStatsController.getOverview);

export const AdminStatsRoutes = router;
