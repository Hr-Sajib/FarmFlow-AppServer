import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import config from "../../../../config/index";
import { IUser } from "./user.interface";

// Define the User schema
const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true, required: [true, "Name is required"] },
    farmerId: { type: String, trim: true, required: [true, "Farmer ID is required"] },
    email: { type: String, lowercase: true, trim: true },
    phone: {
      type: String,
      trim: true,
      required: [true, "Phone number is required"],
      unique: [true, "Phone number is already in use, please provide a unique number!"],
    },
    password: { type: String, required: [true, "Password is required"], select: false },
    photo: { type: String ,trim: true},
    address: { type: String, trim: true, required: [true, "Address is required"] },
    passwordChangedAt: { type: Date, default: null },
    role: {
      type: String,
      enum: {
        values: ["admin", "farmer"],
        message: "Role must be either 'admin' or 'farmer'",
      },
      default:"farmer",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "blocked"],
        message: "Status must be either 'active' or 'blocked'",
      },
      default: "active",
    },
    fieldIds: [{ type: Schema.Types.ObjectId, ref: "Field" }],
    isDeleted: { type: Boolean, default: false },
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

// Export the Mongoose model
export const UserModel = model<IUser>("User", userSchema);