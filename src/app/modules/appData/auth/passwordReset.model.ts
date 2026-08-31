import { Schema, model, Types } from "mongoose";

export interface IPasswordReset {
  userId: Types.ObjectId;
  /** bcrypt hash of the 5-digit code — never the code itself. */
  codeHash: string;
  attempts: number;
  isVerified: boolean;
  expiresAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

/**
 * TTL index: Mongo removes the document once `expiresAt` passes, so expired
 * codes clean themselves up instead of accumulating on the user record.
 */
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel = model<IPasswordReset>(
  "PasswordReset",
  passwordResetSchema
);
