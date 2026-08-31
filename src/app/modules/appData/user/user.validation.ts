import { z } from "zod";

const emailField = z
  .string({ required_error: "Email is required" })
  .email({ message: "Invalid email format" })
  .trim()
  .toLowerCase();

const phoneField = z
  .string()
  .trim()
  .regex(/^01[0-9]{9}$/, {
    message: 'Phone must start with "01" and be 11 digits',
  });

const passwordField = z
  .string({ required_error: "Password is required" })
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password cannot exceed 128 characters" });

const designationSchema = z
  .object({
    designationTitle: z.string().trim().min(1, "Designation title cannot be empty"),
    designatedFrom: z.string().trim().min(1, "Designating institution cannot be empty"),
    documents: z.array(z.string().url({ message: "Each document must be a valid URL" })).default([]),
    isApproved: z.boolean().optional(), // admin-only; stripped for non-admins
  })
  .strict();

/**
 * Public registration. Role is limited to farmer or expert — `admin` is not
 * selectable, and `status`, `userCode` and `expertStatus` are assigned by the
 * server. `.strict()` rejects any of them outright instead of silently
 * dropping them, which is what closes the privilege-escalation path.
 */
const createUserValidationSchema = z.object({
  body: z
    .object({
      fullName: z.string({ required_error: "Full name is required" }).trim().min(1),
      email: emailField,
      password: passwordField,
      address: z.string({ required_error: "Address is required" }).trim().min(1),
      phone: phoneField.optional(),
      photo: z.string().url({ message: "Photo must be a valid URL" }).trim().optional(),
      role: z.enum(["farmer", "expert"], {
        errorMap: () => ({ message: "Role must be either 'farmer' or 'expert'" }),
      }).default("farmer"),
      designations: z.array(designationSchema).optional(),
    })
    .strict(),
});

/**
 * Field allowlists per role. The route accepts the widest schema and the
 * controller narrows it to the caller's role, so a farmer cannot promote
 * themselves by adding `role` to the body.
 */
export const UPDATABLE_FIELDS = {
  admin: [
    "fullName", "email", "phone", "address", "photo",
    "role", "status", "expertStatus", "designations",
  ],
  farmer: ["fullName", "email", "phone", "address", "photo"],
  expert: ["fullName", "email", "phone", "address", "photo", "designations"],
} as const;

const updateUserValidationSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(1).optional(),
      email: emailField.optional(),
      phone: phoneField.optional(),
      address: z.string().trim().min(1).optional(),
      photo: z.string().url({ message: "Photo must be a valid URL" }).trim().optional(),
      // Admin-only in practice — the controller strips these for other roles.
      role: z.enum(["admin", "farmer", "expert"]).optional(),
      status: z.enum(["active", "blocked"]).optional(),
      expertStatus: z.enum(["pending", "verified", "rejected"]).optional(),
      designations: z.array(designationSchema).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
};
