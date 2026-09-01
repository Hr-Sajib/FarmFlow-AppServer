import express from "express";
import rateLimit from "express-rate-limit";

import { publicController } from "./public.controller";

const router = express.Router();

/**
 * These are the only unauthenticated read endpoints in the API, so they are the
 * only ones an anonymous client can hammer. Keyed by IP because there is no
 * user to key by. The hero polls at 5s, well inside this budget.
 */
const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

router.use(publicRateLimiter);

router.get("/telemetry/latest", publicController.getLatestReading);
router.get("/stats", publicController.getStats);

export const PublicRoutes = router;
