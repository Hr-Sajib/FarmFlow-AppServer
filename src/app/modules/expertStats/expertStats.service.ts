import { Types } from "mongoose";

import { UserModel } from "../user/user.model";
import { PostModel } from "../posts/post.model";
import { AdvisorySessionModel } from "../advisorySession/advisorySession.model";
import { FollowModel } from "../follow/follow.model";

export interface IExpertOverview {
  advisories: {
    /** Sessions that reached this expert at all. */
    requested: number;
    resolved: number;
    active: number;
    /** Distinct farmers whose questions they have handled. */
    farmersHelped: number;
  };
  community: { posts: number; comments: number; followers: number };
  reviews: { count: number; averageStars: number | null };
  designations: { total: number; verified: number; pending: number; rejected: number };
}

/**
 * The expert's own record, which is a different question from the admin's
 * platform summary: how much have I been asked for, and how did it go.
 */
const getExpertOverviewFromDB = async (
  userId: string,
  userCode: string
): Promise<IExpertOverview> => {
  const assigned = { expertId: userCode, isDeleted: false };
  const objectId = new Types.ObjectId(userId);

  const [
    requested,
    resolved,
    active,
    farmers,
    posts,
    commentRows,
    followers,
    feedback,
    person,
  ] = await Promise.all([
    AdvisorySessionModel.countDocuments(assigned),
    AdvisorySessionModel.countDocuments({ ...assigned, status: "resolved" }),
    AdvisorySessionModel.countDocuments({ ...assigned, status: "expert_active" }),
    AdvisorySessionModel.distinct("farmerId", assigned),
    PostModel.countDocuments({ creatorId: objectId, isDeleted: false }),
    // Comments live inside posts, so they are counted by unwinding rather than
    // by a collection scan the expert does not own.
    PostModel.aggregate<{ total: number }>([
      { $match: { isDeleted: false } },
      { $unwind: "$comments" },
      { $match: { "comments.commenterId": objectId } },
      { $count: "total" },
    ]),
    FollowModel.countDocuments({ followingCode: userCode }),
    // Only rated sessions count toward the average; an unrated one is not a
    // zero, and treating it as one would punish an expert for silence.
    AdvisorySessionModel.aggregate<{ count: number; average: number }>([
      { $match: { ...assigned, feedbackStarCount: { $gte: 1 } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          average: { $avg: "$feedbackStarCount" },
        },
      },
    ]),
    UserModel.findById(userId).select("designations"),
  ]);

  const designations = person?.designations ?? [];

  return {
    advisories: {
      requested,
      resolved,
      active,
      farmersHelped: farmers.length,
    },
    community: {
      posts,
      comments: commentRows[0]?.total ?? 0,
      followers,
    },
    reviews: {
      count: feedback[0]?.count ?? 0,
      averageStars: feedback[0]
        ? Number(feedback[0].average.toFixed(2))
        : null,
    },
    designations: {
      total: designations.length,
      // isApproved is a tri-state: true approved, false rejected, absent still
      // awaiting a decision.
      verified: designations.filter((d) => d.isApproved === true).length,
      rejected: designations.filter((d) => d.isApproved === false).length,
      pending: designations.filter((d) => d.isApproved === undefined).length,
    },
  };
};

export const expertStatsServices = { getExpertOverviewFromDB };
