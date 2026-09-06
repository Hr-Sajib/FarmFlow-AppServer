import express from "express";
import rateLimit from "express-rate-limit";

import { publicController } from "./public.controller";

const router = express.Router();

/**
 * These are the only unauthenticated read endpoints in the API, so they are the
 * only ones an anonymous client can hammer. Keyed by IP because there is no
 * user to key by, which only works now that Express trusts the proxy and can
 * see who that is.
 *
 * The hero polls every 2s, so one open tab spends 30 of these a minute. The
 * budget allows for several tabs and the occasional stats read on top, and
 * still stops anyone using an unauthenticated endpoint as a firehose.
 */
const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 150,
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
