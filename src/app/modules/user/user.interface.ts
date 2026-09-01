import { Types } from "mongoose";

export type TUserRole = "admin" | "farmer" | "expert";
export type TUserStatus = "active" | "blocked";
export type TExpertStatus = "pending" | "verified" | "rejected";

/**
 * A credential an expert claims (e.g. "Agronomist, BARI").
 * Each is reviewed independently by an admin; the user-level
 * `expertStatus` is what the UI reads for a verified badge.
 */
export interface IDesignation {
  designationTitle: string;
  designatedFrom: string;
  documents: string[]; // S3 URLs of supporting documents
  isApproved: boolean;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

export interface IUser {
  fullName: string;
  /** Login identifier. Unique, lowercased. */
  email: string;
  /** Contact only — no longer used for authentication. */
  phone?: string;
  password: string;
  address: string;
  photo?: string;

  role: TUserRole;
  status: TUserStatus;

  /**
   * Public, role-prefixed identifier: "farmer48392017" | "expert10238475".
   * One field rather than separate farmerId/expertId columns so the schema cannot
   * represent a user with both set, or neither. The prefix encodes the role.
   */
  userCode: string;

  passwordChangedAt?: Date;

  // Expert-only. Absent for farmers and admins.
  designations?: IDesignation[];
  expertStatus?: TExpertStatus;

  /**
   * Marks an account the demo-login endpoint is allowed to sign into without a
   * password. The endpoint matches on this flag rather than on an email from
   * the request, so it can never be pointed at a real user's account.
   */
  isDemo?: boolean;

  isDeleted: boolean;
}
