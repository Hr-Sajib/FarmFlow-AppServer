import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { Request } from "express";
import { extname } from "path";
import { randomBytes } from "crypto";
import httpStatus from "http-status";
import sharp from "sharp";

import config from "../../config";
import AppError from "../errors/AppError";

const s3Client = new S3Client({
  region: config.aws.aws_region,
  credentials: {
    accessKeyId: config.aws.aws_access_key_id as string,
    secretAccessKey: config.aws.aws_secret_access_key as string,
  },
});

export type TFileType = "image" | "video" | "pdf" | "document";

export interface UploadResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimetype: string;
  fileType: TFileType;
}

/**
 * SVG is deliberately excluded: it can embed executable JavaScript, and if
 * served back as image/svg+xml the script runs in this app's origin.
 */
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const storage = multer.memoryStorage();

export const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(
    new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid file type. Allowed: images (JPEG, PNG, GIF, WEBP), videos (MP4, MPEG, MOV, AVI, WEBM), PDF, and Word documents."
    )
  );
};

/**
 * Files are buffered in memory before going to S3, so the per-file cap is also
 * a memory cap: 25 MB x 10 files is the worst case for a single request.
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
    fields: 50,
  },
});

export const getFileType = (mimetype: string): TFileType => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype === "application/pdf") return "pdf";
  return "document";
};

/** Per-type ceilings, checked after multer's blanket limit. */
const MAX_BYTES: Record<TFileType, number> = {
  image: 10 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

export const validateFileSize = (file: Express.Multer.File): void => {
  const fileType = getFileType(file.mimetype);
  const max = MAX_BYTES[fileType];
  if (file.size > max) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${file.originalname} exceeds the ${Math.round(
        max / (1024 * 1024)
      )}MB limit for ${fileType} files`
    );
  }
};

export const validateFiles = (files: Express.Multer.File[]): void => {
  if (!files || files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "No files were provided");
  }
  files.forEach(validateFileSize);
};

/**
 * The object key is generated, never taken from `file.originalname`.
 * Using the client-supplied name would let a caller traverse paths with "../",
 * overwrite another user's object by reusing a filename, and make keys
 * guessable. The original name is preserved in the response instead.
 */
const buildObjectKey = (folder: string, extension: string): string => {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.+/g, "");
  const safeExt = /^\.[a-z0-9]{1,10}$/i.test(extension) ? extension.toLowerCase() : "";
  return `${safeFolder}/${Date.now()}-${randomBytes(12).toString("hex")}${safeExt}`;
};

/** Images are re-encoded to WebP and bounded; everything else passes through. */
const optimizeImage = async (
  file: Express.Multer.File
): Promise<{ buffer: Buffer; mimetype: string; extension: string }> => {
  const originalExtension = extname(file.originalname);

  // GIFs are left alone so animation survives.
  if (!file.mimetype.startsWith("image/") || file.mimetype === "image/gif") {
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      extension: originalExtension,
    };
  }

  try {
    const buffer = await sharp(file.buffer)
      .rotate() // honour EXIF orientation before stripping metadata
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return { buffer, mimetype: "image/webp", extension: ".webp" };
  } catch {
    // A re-encode failure shouldn't fail the upload — store the original.
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      extension: originalExtension,
    };
  }
};

export const uploadSingleFileToS3 = async (
  file: Express.Multer.File,
  folder = "uploads"
): Promise<UploadResult> => {
  validateFileSize(file);

  const processed = await optimizeImage(file);
  const key = buildObjectKey(folder, processed.extension);
  const bucket = config.aws.aws_s3_bucket_name as string;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: processed.buffer,
        ContentType: processed.mimetype,
        CacheControl: "public, max-age=31536000",
      })
    );
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to upload ${file.originalname}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  return {
    // A proxy URL rather than the direct S3 one: the bucket stays private, and
    // a stored link keeps working because the signature is minted on request
    // instead of being baked into the saved value.
    url: `${config.api_origin}/upload/file/${key}`,
    key,
    originalName: file.originalname,
    size: processed.buffer.length,
    mimetype: processed.mimetype,
    fileType: getFileType(processed.mimetype),
  };
};

/** Uploaded in small batches so ten large files don't all sit in memory at once. */
export const uploadMultipleFilesToS3 = async (
  files: Express.Multer.File[],
  folder = "uploads"
): Promise<UploadResult[]> => {
  const MAX_CONCURRENT = 3;
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const batch = files.slice(i, i + MAX_CONCURRENT);
    results.push(
      ...(await Promise.all(batch.map((f) => uploadSingleFileToS3(f, folder))))
    );
  }

  return results;
};

export const deleteFileFromS3 = async (key: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.aws.aws_s3_bucket_name as string,
        Key: key,
      })
    );
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to delete ${key}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
};

/**
 * Signed, time-limited read URL. Generated per request so the bucket needs no
 * public-read policy.
 */
export const getSignedReadUrl = async (
  key: string,
  expiresInSeconds = 3600
): Promise<string> =>
  getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: config.aws.aws_s3_bucket_name as string,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );

/** Recovers the S3 key from a stored URL, for deletes. */
export const extractKeyFromUrl = (url: string): string => {
  const bucket = config.aws.aws_s3_bucket_name as string;
  const region = config.aws.aws_region as string;

  const patterns = [
    // the proxy form this app now stores
    new RegExp(`/upload/file/(.+)$`),
    new RegExp(`^https://${bucket}\\.s3\\.${region}\\.amazonaws\\.com/(.+)$`),
    new RegExp(`^https://${bucket}\\.s3-${region}\\.amazonaws\\.com/(.+)$`),
    new RegExp(`^https://s3\\.${region}\\.amazonaws\\.com/${bucket}/(.+)$`),
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return decodeURIComponent(match[1]);
  }

  throw new AppError(httpStatus.BAD_REQUEST, "Unrecognised file URL");
};

/** Best-effort cleanup when a write fails after its files were already stored. */
export const cleanupUploadedFiles = async (urls: string[]): Promise<void> => {
  if (!urls?.length) return;
  await Promise.allSettled(
    urls.map(async (url) => deleteFileFromS3(extractKeyFromUrl(url)))
  );
};
