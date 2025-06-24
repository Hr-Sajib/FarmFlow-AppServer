import { Model, Types } from "mongoose";

export interface IUser {
  name: string;
  farmerId: string;
  email?: string;
  phone: string;
  password: string;
  address: string;
  passwordChangedAt?: Date;
  role: "admin" | "farmer";
  status: "active" | "blocked";
  fieldIds: Types.ObjectId[];
  isDeleted: boolean;
}
