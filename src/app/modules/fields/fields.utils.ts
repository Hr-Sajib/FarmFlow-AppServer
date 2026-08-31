import httpStatus from "http-status";

import { UserModel } from "../user/user.model";
import { FieldModel } from "./fields.model";
import AppError from "../../errors/AppError";

/** The authenticated caller, resolved by the auth middleware. */
export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

export type TFieldInfo = {
  fieldCrop?: string;
  soilType?: string;
  fieldSizeInAcres?: string;
  latitude: number;
  longitude: number;
  sensorData?: {
    temperature?: string;
    humidity?: string;
    soilMoisture?: string;
    lightIntensity?: string;
  };
  userId?: string;
  role?: "admin" | "farmer";
};

export const isAdmin = (actor: TActor): boolean => actor.role === "admin";

/** Confirms a userCode belongs to a real, active farmer before assigning ownership. */
export const assertFarmerExists = async (farmerCode: string): Promise<void> => {
  const farmer = await UserModel.findOne({
    userCode: farmerCode,
    role: "farmer",
    isDeleted: false,
  });
  if (!farmer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No active farmer with id ${farmerCode}`
    );
  }
};

/** Loads a field and enforces that a non-admin caller owns it. */
export const getOwnedField = async (fieldId: string, actor: TActor) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }
  if (!isAdmin(actor) && field.farmerId !== actor.userCode) {
    throw new AppError(httpStatus.FORBIDDEN, "This field does not belong to you");
  }
  return field;
};
