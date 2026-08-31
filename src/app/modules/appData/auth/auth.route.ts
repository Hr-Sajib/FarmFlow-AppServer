import express from "express";
import rateLimit from "express-rate-limit";

import { AuthController } from "./auth.controller";
import validateRequest from "../../../middlewares/validateRequest";
import auth from "../../../middlewares/auth";
import { AuthValidation } from "./auth.validation";

const router = express.Router();

/**
 * Unauthenticated credential endpoints are rate limited by IP: login guards
 * against password spraying, and the reset endpoints against both mail-bombing
 * a victim's inbox and brute-forcing the five-digit code.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again later." },
});

router.post(
  "/login",
  loginLimiter,
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginUser
);

router.post("/logout", AuthController.logout);

router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken
);

// --- password reset: three stages ---
router.post(
  "/forgot-password",
  resetLimiter,
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword
);

router.post(
  "/verify-reset-code",
  resetLimiter,
  validateRequest(AuthValidation.verifyResetCodeValidationSchema),
  AuthController.verifyResetCode
);

router.post(
  "/reset-password",
  resetLimiter,
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

router.post(
  "/change-password",
  auth("admin", "farmer", "expert"),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

router.patch(
  "/reset-password/:userId",
  auth("admin"),
  validateRequest(AuthValidation.adminResetPasswordValidationSchema),
  AuthController.adminResetPassword
);

export const AuthRoutes = router;
