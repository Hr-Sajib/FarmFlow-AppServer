import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import { IUser } from "./user.interface";
import httpStatus from 'http-status';
import sendResponse from "../../../utils/sendResponse";
import { userServices } from "./user.service";
import AppError from "../../../errors/AppError";
import { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../../../utils/auth.utils";
import config from "../../../../config";




    const createUser = catchAsync(async (req: Request, res: Response) => {
    const userData = req.body as IUser;
    const newUser = await userServices.createUserIntoDB(userData);
  
    sendResponse(res, {
      statusCode: httpStatus.CREATED, 
      success: true,
      message: "ইউজার সফলভাবে তৈরি হয়েছে", 
      data: newUser,
    });
    });





    const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const updatedUser = await userServices.toggleUserStatus(userId);
  
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `User status updated to ${updatedUser.status}`,
      data: updatedUser,
    });
    });


    const updatePassword = catchAsync(async (req: Request, res: Response) => {
        const { oldPassword, newPassword } = req.body;
    
        if (!oldPassword || !newPassword) {
        throw new AppError(400, "Both old and new passwords are required");
        }
    
        // Extract token from Authorization header
        const token = req.headers.authorization;
    
    
        if (!token) {
        throw new AppError(401, "No access-token provided");
        }
    
        // Verify token using the utility function
        let decoded: JwtPayload;
        try {
        decoded = verifyToken(token, config.jwt_access_secret as string);
        } catch (error) {
        throw new AppError(401, "Invalid or expired token");
        }
    
        // Pass authenticated userEmail to service
        const result = await userServices.updateUserPassword(
        decoded.userEmail,
        oldPassword,
        newPassword
        );
    
        sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
        });
    });


    const updateUser = catchAsync(async (req: Request, res: Response) => {
        const { name, email, phone } = req.body; 
      
        const token = req.headers.authorization;
        if (!token) {
          throw new AppError(401, "No access-token provided");
        }
      
        let decoded: JwtPayload;
        try {
          decoded = verifyToken(token, config.jwt_access_secret as string);
        } catch (error) {
          throw new AppError(401, "Invalid or expired token");
        }
      
        const updates = { name, email, phone }; // Only include provided fields
        const updatedUser = await userServices.updateUserData(decoded.userEmail, updates);
      
        sendResponse(res, {
          statusCode: httpStatus.OK,
          success: true,
          message: "User data updated successfully",
          data: updatedUser,
        });
      });









  export const userController = {
    createUser,
    toggleUserStatus,
    updatePassword,
    // getMe,
    // updateUser,
    // getAllUsers
  };