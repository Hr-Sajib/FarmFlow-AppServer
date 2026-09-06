import { Request, Response } from "express";
import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import { UserModel } from "../user/user.model";
import { PostModel } from "../posts/post.model";
import { followServices } from "./follow.service";

const follow = catchAsync(async (req: Request, res: Response) => {
  const data = await followServices.followUserInDB(
    req.params.userCode,
    req.user.userCode as string
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Following",
    data,
  });
});

const unfollow = catchAsync(async (req: Request, res: Response) => {
  const data = await followServices.unfollowUserInDB(
    req.params.userCode,
    req.user.userCode as string
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unfollowed",
    data,
  });
});

/**
 * Everything a profile page shows, in one round trip.
 *
 * Deliberately a narrow projection rather than the user document: a profile is
 * public to anyone signed in, and email, phone and address are not. Posts are
 * filtered the same way the feed is — someone else's unreviewed post is not
 * theirs to see, but your own is.
 */
const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const { userCode } = req.params;
  const viewer = req.user;

  const person = await UserModel.findOne({ userCode, isDeleted: false }).select(
    "fullName role photo userCode address expertStatus designations createdAt"
  );
  if (!person) throw new AppError(httpStatus.NOT_FOUND, "No such account");

  const isSelf = viewer.userCode === userCode;

  const postQuery: Record<string, unknown> = {
    creatorId: person._id,
    isDeleted: false,
  };
  if (!isSelf && viewer.role !== "admin") postQuery.isPassedByAI = true;

  const [posts, follow] = await Promise.all([
    PostModel.find(postQuery)
      .populate({ path: "creatorId", select: "fullName photo role userCode" })
      .sort({ createdAt: -1 })
      .limit(20),
    followServices.getFollowStateFromDB(userCode, viewer.userCode),
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: {
      person: {
        userCode: person.userCode,
        fullName: person.fullName,
        role: person.role,
        photo: person.photo,
        // Where someone farms is public; the rest of the address is not.
        address: person.address,
        expertStatus: person.expertStatus,
        designations:
          person.role === "expert"
            ? (person.designations ?? []).map((d) => ({
                designationTitle: d.designationTitle,
                designatedFrom: d.designatedFrom,
                isApproved: d.isApproved,
              }))
            : undefined,
        joinedAt: person.createdAt,
      },
      isSelf,
      follow,
      posts,
    },
  });
});

export const followController = { follow, unfollow, getPublicProfile };
