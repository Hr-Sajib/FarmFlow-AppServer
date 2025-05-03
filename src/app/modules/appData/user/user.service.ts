import AppError from "../../../errors/AppError";
import { IUser } from "./user.interface";
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


    const updateUserData = async (userEmail: string, updates: Partial<IUser>) => {
        const user = await UserModel.findOne({ email: userEmail });
        if (!user) {
          throw new AppError(404, "User not found");
        }
      
        // Update only the provided fields (name, email)
        if (updates.name) user.name = updates.name;
        if (updates.email) user.email = updates.email;
      
        await user.save();
        return user;
      };

  
export const userServices = {
    createUserIntoDB,
    toggleUserStatus,
    updateUserPassword,
    // getMeFromDB,
    updateUserData,
    // getAllUsersFromDB
  }
  