import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/fileUpload";
import { uploadController } from "./upload.controller";
import { UploadValidation } from "./upload.validation";

const router = express.Router();

/**
 * An authenticated upload endpoint is still a file host — without a limit one
 * account can fill the bucket and the bill. Keyed per user rather than per IP
 * so shared connections aren't penalised.
 */
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Falling back to req.ip raw is not enough on IPv6: a single subscriber is
  // typically handed a whole /64, so one caller could rotate addresses and lift
  // the limit as high as they liked. ipKeyGenerator normalises the address to
  // its subnet, which is the unit a person actually controls. Authenticated
  // callers are still keyed by account, which is tighter than either.
  keyGenerator: (req) =>
    req.user?.userCode ?? (req.ip ? ipKeyGenerator(req.ip) : "anonymous"),
  message: {
    success: false,
    message: "Too many uploads. Please try again in a few minutes.",
  },
});

router.post(
  "/",
  auth("admin", "farmer", "expert"),
  uploadRateLimiter,
  // multer runs before validation so `category` is parsed off the multipart body
  upload.array("files", 10),
  validateRequest(UploadValidation.uploadValidationSchema),
  uploadController.uploadFiles
);

/**
 * Public for images so next/image can fetch them; personal documents require a
 * session. Split by prefix rather than by a query flag so the rule cannot be
 * sidestepped from the client.
 */
router.get(
  "/file/documents/*key",
  auth("admin", "farmer", "expert"),
  uploadController.serveFile
);
router.get("/file/*key", uploadController.serveFile);

router.delete(
  "/",
  auth("admin", "farmer", "expert"),
  validateRequest(UploadValidation.deleteFileValidationSchema),
  uploadController.deleteFile
);

export const UploadRoutes = router;
