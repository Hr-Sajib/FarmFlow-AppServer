import { z } from "zod";

const emailField = z
  .string({ required_error: "Email is required" })
  .email({ message: "Invalid email format" })
  .trim()
  .toLowerCase();

const passwordField = z
  .string({ required_error: "Password is required" })
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password cannot exceed 128 characters" });

const loginValidationSchema = z.object({
  body: z
    .object({
      email: emailField,
      password: z.string({ required_error: "Password is required" }).min(1),
    })
    .strict(),
});

/**
 * The caller picks a role, never an account. Anything outside this set is
 * rejected before it reaches the database.
 */
const demoLoginValidationSchema = z.object({
  body: z
    .object({
      role: z.enum(["farmer", "expert", "admin"], {
        required_error: "Role is required",
        invalid_type_error: "Role must be one of: farmer, expert, admin",
      }),
    })
    .strict(),
});

const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: "Refresh token is required!" }),
  }),
});

/** Stage 1 — request a code. */
const forgotPasswordValidationSchema = z.object({
  body: z.object({ email: emailField }).strict(),
});

/** Stage 2 — prove possession of the code. */
const verifyResetCodeValidationSchema = z.object({
  body: z
    .object({
      email: emailField,
      code: z
        .string({ required_error: "Code is required" })
        .regex(/^[0-9]{5}$/, { message: "Code must be 5 digits" }),
    })
    .strict(),
});

/** Stage 3 — set the new password, authorised by the stage-2 token. */
const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      resetToken: z.string({ required_error: "Reset token is required" }).min(1),
      newPassword: passwordField,
    })
    .strict(),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({ required_error: "Old password is required" }).min(1),
      newPassword: passwordField,
    })
    .strict(),
});

/** Admin override — set any user's password without the code flow. */
const adminResetPasswordValidationSchema = z.object({
  body: z.object({ newPassword: passwordField }).strict(),
});

export const AuthValidation = {
  loginValidationSchema,
  demoLoginValidationSchema,
  refreshTokenValidationSchema,
  forgotPasswordValidationSchema,
  verifyResetCodeValidationSchema,
  resetPasswordValidationSchema,
  changePasswordValidationSchema,
  adminResetPasswordValidationSchema,
};
