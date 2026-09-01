import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import config from "../../../config/index";
import { IDesignation, IUser } from "./user.interface";

const designationSchema = new Schema<IDesignation>(
  {
    designationTitle: {
      type: String,
      trim: true,
      required: [true, "Designation title is required"],
    },
    designatedFrom: {
      type: String,
      trim: true,
      required: [true, "Designating institution is required"],
    },
    documents: [{ type: String, trim: true }],
    isApproved: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: true, timestamps: true }
);

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      trim: true,
      required: [true, "Full name is required"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: [true, "Email is required"],
      unique: true,
    },
    phone: { type: String, trim: true },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    address: {
      type: String,
      trim: true,
      required: [true, "Address is required"],
    },
    photo: { type: String, trim: true },

    role: {
      type: String,
      enum: {
        values: ["admin", "farmer", "expert"],
        message: "Role must be one of: admin, farmer, expert",
      },
      default: "farmer",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "blocked"],
        message: "Status must be either 'active' or 'blocked'",
      },
      default: "active",
    },

    userCode: {
      type: String,
      trim: true,
      required: [true, "User code is required"],
      unique: true,
    },

    passwordChangedAt: { type: Date, default: null },

    designations: { type: [designationSchema], default: undefined },
    expertStatus: {
      type: String,
      enum: {
        values: ["pending", "verified", "rejected"],
        message: "Expert status must be one of: pending, verified, rejected",
      },
    },

    isDemo: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Most listings filter out soft-deleted users and scope by role.
userSchema.index({ role: 1, isDeleted: 1 });

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

export const UserModel = model<IUser>("User", userSchema);
