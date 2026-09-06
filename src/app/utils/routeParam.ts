import { Request } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";

/**
 * Reads a single named route parameter as a string.
 *
 * Express 5 types `req.params[name]` as `string | string[]`, because a wildcard
 * or repeated segment can capture several values. Every route here declares a
 * single named parameter such as `:userId`, so the array case cannot occur in
 * practice — but the type still has to be narrowed, and narrowing it once here
 * is better than a cast at each of the two dozen call sites.
 */
export const routeParam = (req: Request, name: string): string => {
  const raw = req.params[name] as string | string[] | undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Missing route parameter: ${name}`
    );
  }

  return value;
};
