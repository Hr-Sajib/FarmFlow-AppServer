import { Model } from "mongoose";

// user.interface.ts 
export type TFieldData = {
    fieldId: string,
    fieldName: string,
    cropName: string,
    fieldArea: number, //in acres
    fieldLocation: {latitude: number, longitude: number}
}

export interface IUser {
    name: string,
    farmerId: string,
    email: string,
    phone: string,
    password: string;
    passwordChangedAt?: Date;

    role: "admin" | "farmer";
    status:"blocked" | "active";

    totalFieldsCount: number,
    fieldDetails: TFieldData[],
}

// Define the statics interface for the model
export interface IUserModel extends Model<IUser> {
    // Static method
    isUserExistsByEmail(email: string): Promise<IUser | null>;
    isUserExistsByPhone(phone: string): Promise<IUser | null>;
  

    isJWTIssuedBeforePasswordChanged(
      passwordChangedTimestamp: Date,
      jwtIssuedTimestamp: number
    ): boolean;
  }