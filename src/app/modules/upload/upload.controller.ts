import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import {
  uploadMultipleFilesToS3,
  deleteFileFromS3,
  extractKeyFromUrl,
  validateFiles,
} from "../../utils/fileUpload";
import { TUploadCategory } from "./upload.validation";

/**
 * Objects are stored under `<category>/<userCode>/…`. Scoping by the caller's
 * own code is what makes ownership checkable on delete without a separate
 * table of uploads.
 */
const uploadFiles = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files?.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No files received. Send them as multipart/form-data under the 'files' field."
    );
  }

  validateFiles(files);

  const { userCode } = req.user;
  if (!userCode) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User code missing from token");
  }

  const category = req.body.category as TUploadCategory;
  const results = await uploadMultipleFilesToS3(files, `${category}/${userCode}`);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${results.length} file(s) uploaded successfully`,
    data: results,
  });
});

/**
 * A caller may only delete objects inside their own prefix; admins may delete
 * anything. Without this check any authenticated user could delete another
 * farmer's field image by passing its URL.
 */
const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.body as { url: string };
  const { userCode, role } = req.user;

  const key = extractKeyFromUrl(url);

  if (role !== "admin") {
    const segments = key.split("/");
    const ownerSegment = segments[1];
    if (ownerSegment !== userCode) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only delete files you uploaded"
      );
    }
  }

  await deleteFileFromS3(key);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "File deleted successfully",
    data: { key },
  });
});

export const uploadController = {
  uploadFiles,
  deleteFile,
};
