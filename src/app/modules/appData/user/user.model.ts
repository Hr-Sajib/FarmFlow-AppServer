import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import config from "../../../../config/index";
import { IUser, TFieldData, IUserModel } from "./user.interface";

// Define the FieldData schema
const fieldDataSchema = new Schema<TFieldData>(
  {
    fieldId: { type: String, trim: true },
    fieldName: { type: String, trim: true },
    cropName: { type: String, trim: true },
    fieldArea: { type: Number },
    fieldLocation: {
      type: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
  },
  { _id: false }
);

// Define the User schema
const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    farmerId: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true }, // No unique constraint
    phone: {
      type: String,
      trim: true,
      unique: [true, "ফোন নাম্বারটি অলরেডি ব্যবহৃত হচ্ছে, ইউনিক নাম্বার দিন!"],
    },
    password: { type: String },
    passwordChangedAt: { type: Date, default: null },
    role: { type: String },
    status: { type: String, default: "active" },
    totalFieldsCount: { type: Number },
    fieldDetails: { type: [fieldDataSchema] },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds)
    );
  }
  next();
});

// Define static methods
userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await this.findOne({ email }).select("+password");
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number
): boolean {
  const passwordChangedTime = new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

// Export the Mongoose model
export const UserModel = model<IUser, IUserModel>("User", userSchema);