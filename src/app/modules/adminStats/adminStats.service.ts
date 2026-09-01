import { UserModel } from "../user/user.model";
import { FieldModel } from "../fields/fields.model";
import { AdvisorySessionModel } from "../advisorySession/advisorySession.model";
import { PostModel } from "../posts/post.model";
import {
  IAdminOverview,
  IAdvisoryStats,
  IExpertStats,
  IFarmerStats,
  IFieldStats,
  IForumStats,
  IMonthlyCount,
} from "./adminStats.interface";

/** How far back the progression charts reach. */
const MONTHS = 12;

/**
 * Signups per month for one role, as both the month's own count and a running
 * total.
 *
 * Months with no signups are absent from the aggregation, and a line chart that
 * skips them draws a straight run between two distant points and implies growth
 * that did not happen — so the empty months are filled back in here.
 */
const monthlySignups = async (role: string): Promise<IMonthlyCount[]> => {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - (MONTHS - 1), 1);
  start.setUTCHours(0, 0, 0, 0);

  const [rows, before] = await Promise.all([
    UserModel.aggregate<{ _id: string; count: number }>([
      { $match: { role, isDeleted: false, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Everyone who already existed, so the cumulative line starts at the real
    // total rather than at zero.
    UserModel.countDocuments({ role, isDeleted: false, createdAt: { $lt: start } }),
  ]);

  const counts = new Map(rows.map((r) => [r._id, r.count]));

  const series: IMonthlyCount[] = [];
  let cumulative = before;

  for (let i = 0; i < MONTHS; i += 1) {
    const d = new Date(start);
    d.setUTCMonth(start.getUTCMonth() + i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const count = counts.get(key) ?? 0;
    cumulative += count;
    series.push({ month: key, count, cumulative });
  }

  return series;
};

const farmerStats = async (): Promise<IFarmerStats> => {
  // A farmer counts as integrated when they own a field that is switched on,
  // so this is the set of owners of active fields, not a count of fields.
  const owners = await FieldModel.distinct("farmerId", {
    isDeleted: false,
    fieldStatus: "active",
  });

  const [total, active, fieldIntegrated, monthly] = await Promise.all([
    UserModel.countDocuments({ role: "farmer", isDeleted: false }),
    UserModel.countDocuments({ role: "farmer", isDeleted: false, status: "active" }),
    UserModel.countDocuments({
      role: "farmer",
      isDeleted: false,
      userCode: { $in: owners },
    }),
    monthlySignups("farmer"),
  ]);

  return { total, active, fieldIntegrated, monthly };
};

const expertStats = async (): Promise<IExpertStats> => {
  const [total, active, designated, designationStates, monthly] = await Promise.all([
    UserModel.countDocuments({ role: "expert", isDeleted: false }),
    UserModel.countDocuments({ role: "expert", isDeleted: false, status: "active" }),
    UserModel.countDocuments({
      role: "expert",
      isDeleted: false,
      "designations.0": { $exists: true },
    }),
    // Counted per designation, not per expert: one expert may hold several,
    // each at a different point in review.
    UserModel.aggregate<{ _id: boolean | null; count: number }>([
      { $match: { role: "expert", isDeleted: false } },
      { $unwind: "$designations" },
      { $group: { _id: "$designations.isApproved", count: { $sum: 1 } } },
    ]),
    monthlySignups("expert"),
  ]);

  const byState = new Map(designationStates.map((r) => [String(r._id), r.count]));

  return {
    total,
    active,
    designated,
    // `isApproved` is a tri-state in practice: true approved, false rejected,
    // absent still awaiting a decision.
    approvedDesignations: byState.get("true") ?? 0,
    rejectedDesignations: byState.get("false") ?? 0,
    pendingDesignations:
      (byState.get("null") ?? 0) + (byState.get("undefined") ?? 0),
    monthly,
  };
};

const fieldStats = async (): Promise<IFieldStats> => {
  const [total, active] = await Promise.all([
    FieldModel.countDocuments({ isDeleted: false }),
    FieldModel.countDocuments({ isDeleted: false, fieldStatus: "active" }),
  ]);
  return { total, active };
};

const advisoryStats = async (): Promise<IAdvisoryStats> => {
  const [total, active, expertNeeded] = await Promise.all([
    AdvisorySessionModel.countDocuments({ isDeleted: false }),
    AdvisorySessionModel.countDocuments({
      isDeleted: false,
      status: { $in: ["ai_active", "awaiting_expert", "expert_active"] },
    }),
    // Anything that ever reached a human: either one is assigned now, or one
    // was asked for. Escalation is not reversible, so this does not undercount
    // sessions that have since been resolved.
    AdvisorySessionModel.countDocuments({
      isDeleted: false,
      $or: [
        { expertId: { $exists: true, $ne: null } },
        { status: { $in: ["awaiting_expert", "expert_active"] } },
      ],
    }),
  ]);

  return { total, active, aiHandled: total - expertNeeded, expertNeeded };
};

const forumStats = async (): Promise<IForumStats> => {
  const [posts, contributors, totals] = await Promise.all([
    PostModel.countDocuments({ isDeleted: false }),
    PostModel.distinct("creatorId", { isDeleted: false }),
    PostModel.aggregate<{ comments: number; impressions: number }>([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          comments: { $sum: { $size: "$comments" } },
          impressions: {
            $sum: {
              $add: [
                { $size: { $ifNull: ["$reactions.likes", []] } },
                { $size: { $ifNull: ["$reactions.dislikes", []] } },
              ],
            },
          },
        },
      },
    ]),
  ]);

  return {
    posts,
    contributors: contributors.length,
    comments: totals[0]?.comments ?? 0,
    impressions: totals[0]?.impressions ?? 0,
  };
};

/** All five sections in parallel — they share nothing. */
const getAdminOverviewFromDB = async (): Promise<IAdminOverview> => {
  const [farmers, experts, fields, advisories, forum] = await Promise.all([
    farmerStats(),
    expertStats(),
    fieldStats(),
    advisoryStats(),
    forumStats(),
  ]);

  return { farmers, experts, fields, advisories, forum };
};

export const adminStatsServices = { getAdminOverviewFromDB };
