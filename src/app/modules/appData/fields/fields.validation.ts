import { z } from "zod";

// Define the field location schema
const fieldLocationSchema = z.object({
  latitude: z
    .number({ invalid_type_error: "Latitude must be a number", required_error: "Latitude is required" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number({ invalid_type_error: "Longitude must be a number", required_error: "Longitude is required" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
}).strict();

// Define the create field validation schema
const createFieldValidationSchema = z.object({
  body: z.object({
    fieldName: z
      .string({ invalid_type_error: "Field name must be a string", required_error: "Field name is required" })
      .trim()
      .min(1, "Field name cannot be empty"),
    fieldImage: z
      .string({ invalid_type_error: "Field image must be a string", required_error: "Field image is required" })
      .url({ message: "Field image must be a valid URL" })
      .trim(),
    fieldCrop: z
      .string({ invalid_type_error: "Field crop must be a string", required_error: "Field crop is required" })
      .trim()
      .min(1, "Field crop cannot be empty"),
    fieldLocation: fieldLocationSchema,
    fieldSizeInAcres: z
      .number({ invalid_type_error: "Field size must be a number" })
      .nonnegative({ message: "Field size cannot be negative" })
      .optional(),
    soilType: z
      .enum(["clay", "loam", "sandy", "silt", "peat", "chalk", "saline"], {
        errorMap: () => ({ message: "Soil type must be one of: clay, loam, sandy, silt, peat, chalk, saline" }),
      })
      .optional(),
    region: z
      .string({ invalid_type_error: "Region must be a string" })
      .trim()
      .min(1, "Region cannot be empty")
      .optional(),
    fieldStatus: z
      .enum(["active", "inactive", "maintenance"], {
        errorMap: () => ({ message: "Field status must be one of: active, inactive, maintenance" }),
      })
      .optional(),
  }).strict(),
});

// Define the update field validation schema
const updateFieldValidationSchema = z.object({
  body: z.object({
    fieldId: z
      .string({ invalid_type_error: "Field ID must be a string" })
      .trim()
      .min(1, "Field ID cannot be empty")
      .regex(/^fd[0-9]+$/, {
        message: 'Farmer ID must start with "fr" followed by numbers',
      })
      .optional(),
    fieldName: z
      .string({ invalid_type_error: "Field name must be a string" })
      .trim()
      .min(1, "Field name cannot be empty")
      .optional(),
    fieldImage: z
      .string({ invalid_type_error: "Field image must be a string" })
      .url({ message: "Field image must be a valid URL" })
      .trim()
      .optional(),
    fieldCrop: z
      .string({ invalid_type_error: "Field crop must be a string" })
      .trim()
      .min(1, "Field crop cannot be empty")
      .optional(),
    fieldLocation: fieldLocationSchema.optional(),
    fieldSizeInAcres: z
      .number({ invalid_type_error: "Field size must be a number" })
      .nonnegative({ message: "Field size cannot be negative" })
      .optional(),
    soilType: z
      .enum(["clay", "loam", "sandy", "silt", "peat", "chalk", "saline"], {
        errorMap: () => ({ message: "Soil type must be one of: clay, loam, sandy, silt, peat, chalk, saline" }),
      })
      .optional(),
    farmerId: z
      .string({ invalid_type_error: "Farmer ID must be a string" })
      .trim()
      .min(1, "Farmer ID cannot be empty")
      .regex(/^fr[0-9]+$/, {
        message: 'Farmer ID must start with "fr" followed by numbers',
      })
      .optional(),
    region: z
      .string({ invalid_type_error: "Region must be a string" })
      .trim()
      .min(1, "Region cannot be empty")
      .optional(),
    fieldStatus: z
      .enum(["active", "inactive", "maintenance"], {
        errorMap: () => ({ message: "Field status must be one of: active, inactive, maintenance" }),
      })
      .optional(),
  }).strict(),
});

export const FieldValidation = {
  createFieldValidationSchema,
  updateFieldValidationSchema,
};