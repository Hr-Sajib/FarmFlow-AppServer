import { TLoginUser } from "./auth.interface";
import httpStatus from 'http-status';
import bcrypt from "bcrypt";
import { UserModel } from "../user/user.model";
import AppError from "../../../errors/AppError";
import { createToken, verifyToken } from "../../../utils/auth.utils";
import config from "../../../../config";


const loginUserIntoDB = async (payload: TLoginUser) => {
  const { phone, password } = payload;

  // Fetch user by phone
  const user = await UserModel.findOne({phone}).select("+password");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user?.status === "blocked") {
    throw new AppError(httpStatus.NOT_FOUND, "You are blocked! Contact Us..");
  }


  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid password");
  }

  const jwtPayload = {
    userPhone: user.phone,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  // Verify the refresh token
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  const { userEmail, userPhone } = decoded;

  // Check if the user exists using either email or phone
  const user = await UserModel.findOne({userPhone});

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }



  const jwtPayload = {
    userEmail: user.email,
    userPhone: user.phone,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return {
    accessToken,
  };
};

export const authServices = {
  loginUserIntoDB,
  refreshToken,
};