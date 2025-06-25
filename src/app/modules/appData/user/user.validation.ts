import { z } from "zod";

const createUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: "Name must be a string",
        required_error: "Name is required",
      })
      .trim()
      .min(1, { message: "Name cannot be empty" }),
    address: z
      .string({
        invalid_type_error: "Address must be a string",
        required_error: "Address is required",
      })
      .trim()
      .min(1, { message: "Address cannot be empty" }),
    farmerId: z
      .string({
        invalid_type_error: "Farmer ID must be a string",
        required_error: "Farmer ID is required",
      })
      .trim()
      .min(1, { message: "Farmer ID cannot be empty" })
      .regex(/^fr[0-9]+$/, {
        message: 'Farmer ID must start with "fr" followed by numbers',
      }),
    email: z
      .string({
        invalid_type_error: "Email must be a string",
      })
      .email({ message: "Invalid email format" })
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string({
        invalid_type_error: "Phone number must be a string",
        required_error: "Phone number is required",
      })
      .trim()
      .length(11, { message: "Phone number must be exactly 11 digits" })
      .regex(/^01[0-9]{9}$/, {
        message: 'Phone number must start with "01" and be 11 digits',
      }),
    password: z
      .string({
        invalid_type_error: "Password must be a string",
        required_error: "Password is required",
      })
      .min(6, { message: "Password must be at least 6 characters" })
      .max(10, { message: "Password cannot exceed 10 characters" }),
    passwordChangedAt: z
      .date({
        invalid_type_error: "Password changed date must be a valid date",
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: "Role must be a string",
        required_error: "Role is required",
      })
      .refine((val) => ["admin", "farmer"].includes(val), {
        message: 'Role must be either "admin" or "farmer"',
      }),
    status: z
      .string({
        invalid_type_error: "Status must be a string",
        required_error: "Status is required",
      })
      .refine((val) => ["blocked", "active"].includes(val), {
        message: 'Status must be either "blocked" or "active"',
      })
      .default("active"),
    fieldIds: z
      .array(
        z
          .string({
            invalid_type_error: "Field ID must be a string",
            required_error: "Field ID is required",
          })
          .regex(/^fd[0-9]+$/, {
            message: 'Field ID must start with "fd" followed by numbers',
          }),
        { required_error: "Field IDs array is required" }
      )
      .optional(),
  }).strict(),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: "Name must be a string",
      })
      .trim()
      .min(1, { message: "Name cannot be empty" })
      .optional(),
    address: z
      .string({
        invalid_type_error: "Address must be a string",
      })
      .trim()
      .min(1, { message: "Address cannot be empty" })
      .optional(),
    farmerId: z
      .string({
        invalid_type_error: "Farmer ID must be a string",
      })
      .trim()
      .min(1, { message: "Farmer ID cannot be empty" })
      .regex(/^fr[0-9]+$/, {
        message: 'Farmer ID must start with "fr" followed by numbers',
      })
      .optional(),
    email: z
      .string({
        invalid_type_error: "Email must be a string",
      })
      .email({ message: "Invalid email format" })
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string({
        invalid_type_error: "Phone number must be a string",
      })
      .trim()
      .length(11, { message: "Phone number must be exactly 11 digits" })
      .regex(/^01[0-9]{9}$/, {
        message: 'Phone number must start with "01" and be 11 digits',
      })
      .optional(),
    password: z
      .string({
        invalid_type_error: "Password must be a string",
      })
      .min(6, { message: "Password must be at least 6 characters" })
      .max(10, { message: "Password cannot exceed 10 characters" })
      .optional(),
    passwordChangedAt: z
      .date({
        invalid_type_error: "Password changed date must be a valid date",
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: "Role must be a string",
      })
      .refine((val) => ["admin", "farmer"].includes(val), {
        message: 'Role must be either "admin" or "farmer"',
      })
      .optional(),
    status: z
      .string({
        invalid_type_error: "Status must be a string",
      })
      .refine((val) => ["blocked", "active"].includes(val), {
        message: 'Status must be either "blocked" or "active"',
      })
      .optional(),
    fieldIds: z
      .array(
        z
          .string({
            invalid_type_error: "Field ID must be a string",
          })
          .regex(/^fd[0-9]+$/, {
            message: 'Field ID must start with "fd" followed by numbers',
          })
      )
      .optional(),
  }).strict(),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
};