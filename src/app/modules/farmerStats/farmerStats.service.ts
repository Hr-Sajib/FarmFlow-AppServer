import { Types } from "mongoose";

import { FieldModel } from "../fields/fields.model";
import { PostModel } from "../posts/post.model";
import { AdvisorySessionModel } from "../advisorySession/advisorySession.model";
import { FollowModel } from "../follow/follow.model";
import { sensorDataServices } from "../sensorData/sensorData.service";
import type { IFarmerOverview } from "./farmerStats.interface";

const REPORTING_WINDOW_MS = 10 * 60 * 1000;

/**
 * The farmer's own record: their fields, whether those fields are actually
 * reporting, and how their advisory and community activity is going.
 */
const getFarmerOverviewFromDB = async (
  userId: string,
  farmerCode: string
): Promise<IFarmerOverview> => {
  const objectId = new Types.ObjectId(userId);
  const owned = { farmerId: farmerCode, isDeleted: false };

  const [
    fields,
    latestReadings,
    trend,
    advisoryTotal,
    advisoryResolved,
    advisoryActive,
    posts,
    commentRows,
    followers,
    following,
  ] = await Promise.all([
    FieldModel.find(owned).lean(),
    sensorDataServices.getLatestByFarmerIdFromDB(farmerCode),
    sensorDataServices.getAggregatedSeriesForFarmerFromDB(farmerCode, "24h"),
    AdvisorySessionModel.countDocuments(owned),
    AdvisorySessionModel.countDocuments({ ...owned, status: "resolved" }),
    AdvisorySessionModel.countDocuments({
      ...owned,
      status: { $in: ["ai_active", "awaiting_expert", "expert_active"] },
    }),
    PostModel.countDocuments({ creatorId: objectId, isDeleted: false }),
    PostModel.aggregate<{ total: number }>([
      { $match: { isDeleted: false } },
      { $unwind: "$comments" },
      { $match: { "comments.commenterId": objectId } },
      { $count: "total" },
    ]),
    FollowModel.countDocuments({ followingCode: farmerCode }),
    FollowModel.countDocuments({ followerCode: farmerCode }),
  ]);

  const latestByFieldId = new Map(
    latestReadings.map((r) => [r.meta.fieldId, r])
  );
  const now = Date.now();

  const latestByField = fields.map((field) => {
    const reading = latestByFieldId.get(field.fieldId) ?? null;
    return {
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      environmentType: field.environmentType,
      isReporting: reading ? now - new Date(reading.ts).getTime() < REPORTING_WINDOW_MS : false,
      ts: reading?.ts ? new Date(reading.ts).toISOString() : null,
      temperature: reading?.temperature ?? null,
      humidity: reading?.humidity ?? null,
      soilMoisture: reading?.soilMoisture ?? null,
      lightIntensity: reading?.lightIntensity ?? null,
    };
  });

  return {
    fields: {
      total: fields.length,
      active: fields.filter((f) => (f.fieldStatus ?? "active") === "active").length,
      reporting: latestByField.filter((f) => f.isReporting).length,
    },
    advisories: {
      total: advisoryTotal,
      active: advisoryActive,
      resolved: advisoryResolved,
    },
    community: {
      posts,
      comments: commentRows[0]?.total ?? 0,
      followers,
      following,
    },
    latestByField,
    trend,
  };
};

export const farmerStatsServices = { getFarmerOverviewFromDB };
