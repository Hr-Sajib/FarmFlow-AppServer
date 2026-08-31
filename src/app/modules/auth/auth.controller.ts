import httpStatus from "http-status";
import config from "../../../config";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { authServices } from "./auth.service";

const refreshCookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

const loginUser = catchAsync(async (req, res) => {
  const { refreshToken, accessToken } = await authServices.loginUserIntoDB(req.body);

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: { accessToken },
  });
});

const logout = catchAsync(async (req, res) => {
  res.clearCookie("refreshToken", { ...refreshCookieOptions, maxAge: undefined });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await authServices.refreshToken(req.cookies.refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token retrieved successfully",
    data: result,
  });
});

/** Stage 1 of 3. */
const forgotPassword = catchAsync(async (req, res) => {
  const result = await authServices.forgotPassword(req.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/** Stage 2 of 3. */
const verifyResetCode = catchAsync(async (req, res) => {
  const result = await authServices.verifyResetCode(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Code verified. You can now set a new password.",
    data: result,
  });
});

/** Stage 3 of 3. */
const resetPassword = catchAsync(async (req, res) => {
  const result = await authServices.resetPassword(req.body);
  res.clearCookie("refreshToken", { ...refreshCookieOptions, maxAge: undefined });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await authServices.changePassword(req.user.userId, req.body);
  res.clearCookie("refreshToken", { ...refreshCookieOptions, maxAge: undefined });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const adminResetPassword = catchAsync(async (req, res) => {
  const result = await authServices.adminResetPassword(
    req.params.userId,
    req.body.newPassword
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const AuthController = {
  loginUser,
  logout,
  refreshToken,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  adminResetPassword,
};
