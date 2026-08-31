import { z } from "zod";

const phoneSchema = z
  .string({
    invalid_type_error: "Phone number must be a string",
    required_error: "Phone number is required",
  })
  .trim()
  .length(11, { message: "Phone number must be exactly 11 digits" })
  .regex(/^01[0-9]{9}$/, {
    message: 'Phone number must start with "01" and be 11 digits',
  });

// Min 6 keeps the previous floor. The old max of 10 was raised: capping
// passwords low blocks password managers and long passphrases for no benefit.
const passwordSchema = z
  .string({
    invalid_type_error: "Password must be a string",
    required_error: "Password is required",
  })
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password cannot exceed 128 characters" });

const designationSchema = z
  .object({
    designationTitle: z
      .string({ required_error: "Designation title is required" })
      .trim()
      .min(1, { message: "Designation title cannot be empty" }),
    designatedFrom: z
      .string({ required_error: "Designating institution is required" })
      .trim()
      .min(1, { message: "Designating institution cannot be empty" }),
    documents: z
      .array(z.string().url({ message: "Each document must be a valid URL" }))
      .default([]),
  })
  .strict();

/**
 * Registration payload. `userCode`, `role`, `status` and `expertStatus` are
 * deliberately NOT accepted from the client — they are assigned server-side.
 * `.strict()` rejects them outright rather than silently dropping them,
 * which is what closes the mass-assignment hole.
 */
const createUserValidationSchema = z.object({
  body: z
    .object({
      fullName: z
        .string({
          invalid_type_error: "Full name must be a string",
          required_error: "Full name is required",
        })
        .trim()
        .min(1, { message: "Full name cannot be empty" }),
      phone: phoneSchema,
      email: z
        .string({ invalid_type_error: "Email must be a string" })
        .email({ message: "Invalid email format" })
        .trim()
        .toLowerCase()
        .optional(),
      password: passwordSchema,
      address: z
        .string({
          invalid_type_error: "Address must be a string",
          required_error: "Address is required",
        })
        .trim()
        .min(1, { message: "Address cannot be empty" }),
      photo: z
        .string()
        .url({ message: "Photo must be a valid URL" })
        .trim()
        .optional(),
      designations: z.array(designationSchema).optional(),
    })
    .strict(),
});

/**
 * Self-service profile update. Role, status, userCode and expertStatus are
 * excluded — privilege changes belong on dedicated admin routes so they can
 * carry their own authorization.
 */
const updateUserValidationSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(1).optional(),
      email: z
        .string()
        .email({ message: "Invalid email format" })
        .trim()
        .toLowerCase()
        .optional(),
      address: z.string().trim().min(1).optional(),
      photo: z.string().url({ message: "Photo must be a valid URL" }).trim().optional(),
      phone: phoneSchema.optional(),
    })
    .strict(),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({ required_error: "Old password is required" }),
      newPassword: passwordSchema,
    })
    .strict(),
});

/** Admin-only: block or unblock a user. */
const changeUserStatusValidationSchema = z.object({
  body: z
    .object({
      status: z.enum(["active", "blocked"], {
        errorMap: () => ({ message: "Status must be either 'active' or 'blocked'" }),
      }),
    })
    .strict(),
});

/** Admin-only: approve or reject one claimed designation. */
const reviewDesignationValidationSchema = z.object({
  body: z
    .object({
      designationId: z
        .string({ required_error: "Designation id is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid designation id" }),
      isApproved: z.boolean({ required_error: "isApproved is required" }),
    })
    .strict(),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  changePasswordValidationSchema,
  changeUserStatusValidationSchema,
  reviewDesignationValidationSchema,
};
