import express from "express";
import rateLimit from "express-rate-limit";

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
  keyGenerator: (req) => req.user?.userCode ?? req.ip ?? "anonymous",
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

router.delete(
  "/",
  auth("admin", "farmer", "expert"),
  validateRequest(UploadValidation.deleteFileValidationSchema),
  uploadController.deleteFile
);

export const UploadRoutes = router;
