
// auth.ts 
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import config from "../../config";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import { TUserRole } from "../modules/appData/user/user.interface";
import { UserModel } from "../modules/appData/user/user.model";


const auth = (...requiredRoles: TUserRole[]) => {
  console.log("auth reached..",)
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    // Normalize token (handle "Bearer <token>" or raw token)
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized | No authorization token provided | Login first");
    }
    if (token.startsWith("Bearer ")) {
      token = token.slice(7); // Remove "Bearer " prefix
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Token has expired");
      }
      if (error instanceof JsonWebTokenError) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token");
      }
      throw new AppError(httpStatus.UNAUTHORIZED, "Token verification failed");
    }

    const { role, userPhone } = decoded;

    // Check if user exists
    const user = await UserModel.isUserExistsByPhone(userPhone);
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found in auth middleware");
    }


    // Check role
    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, "You are not permitted to do that");
    }

    req.user = decoded as JwtPayload & { role: string };
    next();
  });
};

export default auth;