import { z } from "zod";

/**
 * Folders are whitelisted rather than free-form so a caller cannot invent
 * arbitrary prefixes in the bucket.
 */
export const UPLOAD_CATEGORIES = [
  "profile",
  "fields",
  "posts",
  "advisory",
  "documents",
] as const;

export type TUploadCategory = (typeof UPLOAD_CATEGORIES)[number];

const uploadValidationSchema = z.object({
  body: z
    .object({
      category: z.enum(UPLOAD_CATEGORIES, {
        errorMap: () => ({
          message: `Category must be one of: ${UPLOAD_CATEGORIES.join(", ")}`,
        }),
      }),
    })
    .strict(),
});

const deleteFileValidationSchema = z.object({
  body: z
    .object({
      url: z
        .string({ required_error: "url is required" })
        .url({ message: "url must be a valid URL" }),
    })
    .strict(),
});

export const UploadValidation = {
  uploadValidationSchema,
  deleteFileValidationSchema,
};
