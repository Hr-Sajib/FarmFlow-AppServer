import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { UserModel } from "../user/user.model";
import { FollowModel } from "./follow.model";

const assertFollowable = async (followingCode: string, followerCode: string) => {
  if (followingCode === followerCode) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot follow yourself");
  }
  const target = await UserModel.findOne({
    userCode: followingCode,
    isDeleted: false,
  });
  if (!target) throw new AppError(httpStatus.NOT_FOUND, "No such account");
  return target;
};

const followUserInDB = async (followingCode: string, followerCode: string) => {
  await assertFollowable(followingCode, followerCode);

  // Upsert rather than create: following twice is the same state as following
  // once, so it should not be an error the client has to handle.
  await FollowModel.updateOne(
    { followerCode, followingCode },
    { $setOnInsert: { followerCode, followingCode } },
    { upsert: true }
  );

  return { following: true };
};

const unfollowUserInDB = async (followingCode: string, followerCode: string) => {
  await FollowModel.deleteOne({ followerCode, followingCode });
  return { following: false };
};

/** Counts and the viewer's own relationship, which is all a profile header needs. */
const getFollowStateFromDB = async (
  profileCode: string,
  viewerCode?: string
) => {
  const [followers, following, mine] = await Promise.all([
    FollowModel.countDocuments({ followingCode: profileCode }),
    FollowModel.countDocuments({ followerCode: profileCode }),
    viewerCode
      ? FollowModel.exists({ followerCode: viewerCode, followingCode: profileCode })
      : null,
  ]);

  return { followers, following, isFollowing: Boolean(mine) };
};

export const followServices = {
  followUserInDB,
  unfollowUserInDB,
  getFollowStateFromDB,
};
