// auth.ts
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import config from "../../config";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import { UserModel } from "../modules/appData/user/user.model";

const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "You are not authorized | No authorization token provided | Login first"
      );
    }
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

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

    const { userId } = decoded;

    // Looked up by immutable id rather than a contact field, so changing an
    // email never invalidates a session by accident.
    const user = await UserModel.findById(userId);

    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User no longer exists");
    }
    if (user.status === "blocked") {
      throw new AppError(httpStatus.FORBIDDEN, "Your account is blocked");
    }

    /**
     * A token minted before the password changed must stop working, otherwise
     * resetting a password does not evict an attacker holding an older token.
     */
    if (user.passwordChangedAt && decoded.iat) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSeconds) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Password was changed. Please log in again."
        );
      }
    }

    // Role is read from the database rather than the token, so a role revoked
    // after the token was issued takes effect immediately.
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, "You are not permitted to do that");
    }

    req.user = {
      ...decoded,
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      userCode: user.userCode,
    } as JwtPayload & { userId: string; role: string; userCode: string };

    next();
  });
};

export default auth;
