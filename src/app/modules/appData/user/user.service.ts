import AppError from "../../../errors/AppError";
import { IUser, TFieldData } from "./user.interface";
import { UserModel } from "./user.model";
import bcrypt from "bcrypt"; // Make sure bcrypt is installed



    const createUserIntoDB = async(payload: IUser) => {
        const newUser = await UserModel.create(payload); 
        if(!newUser){
        throw new AppError(400,"ইউজার সফলভাবে তৈরি হয়নি! ")
        }
        return newUser;
    }



    const toggleUserStatus = async (userId: string) => {
        const user = await UserModel.findById(userId);
        
        if (!user) {
        throw new AppError(404, "User not found!");
        }
    
        const newStatus = user.status === "active" ? "blocked" : "active";
        
        user.status = newStatus;
        await user.save();
    
        return user;
    };



    const updateUserPassword = async (
        phone: string,
        oldPassword: string,
        newPassword: string
    ) => {
        const user = await UserModel.findOne({ phone: phone }).select("+password");
        if (!user) {
        throw new AppError(404, "User not found");
        }
    
        // Verify password
        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    
        if (!isOldPasswordCorrect) {
        throw new AppError(401, "Old password is incorrect");
        }
    
        user.password = newPassword;
        user.passwordChangedAt = new Date();
    
        await user.save();
    
    return { message: "Password updated successfully" };
    };


    const updateUserData = async (userPhone: string, updates: Partial<IUser>) => {
        const user = await UserModel.findOne({ phone: userPhone });
        if (!user) {
          throw new AppError(404, "User not found");
        }
      
        // Update scalar fields
        if (updates.name) user.name = updates.name;
        if (updates.email) user.email = updates.email;
      
        // Update fieldDetails array (append or update specific elements)
        if (updates.fieldDetails) {
          updates.fieldDetails.forEach((newField: TFieldData) => {
            const existingIndex = user.fieldDetails.findIndex(
              (field) => field.fieldId === newField.fieldId
            );
            if (existingIndex !== -1) {
              // Update existing field
              user.fieldDetails[existingIndex] = newField;
            } else {
              // Append new field
              user.fieldDetails.push(newField);
            }
          });
          user.totalFieldsCount = user.fieldDetails.length; // Update totalFieldsCount
        }
      
        await user.save();
        return user;
      };



    const deleteFieldFromUserData = async (userPhone: string, fieldId: string) => {
      const user = await UserModel.findOne({ phone: userPhone });
      if (!user) {
        throw new AppError(404, "User not found");
      }
    
      const initialLength = user.fieldDetails.length;
      user.fieldDetails = user.fieldDetails.filter((field: TFieldData) => field.fieldId !== fieldId);
      // console.log("fieldArray initial length: ",initialLength);
      // console.log("user.fieldDetails after filter: ",user.fieldDetails);
    
      if (user.fieldDetails.length === initialLength) {
        throw new AppError(404, "Field not found in fieldDetails");
      }
    
      user.totalFieldsCount = user.fieldDetails.length;
      await user.save();
      return user;
    };

  
    const addFieldToUserData = async (userPhone: string, fieldData: TFieldData) => {
      const user = await UserModel.findOne({ phone: userPhone });
      if (!user) {
        throw new AppError(404, "User not found");
      }
    
      const newFieldsArray = {...user.fieldDetails,fieldData};
    
      user.totalFieldsCount = newFieldsArray.length;
      await user.save();
      return user;
    };

  
export const userServices = {
    createUserIntoDB,
    toggleUserStatus,
    updateUserPassword,
    deleteFieldFromUserData,
    addFieldToUserData,
    // getMeFromDB,
    updateUserData,
    // getAllUsersFromDB
  }
  