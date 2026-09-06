import type { ITelemetryBucket } from "../sensorData/sensorData.interface";

export interface IFarmerFieldSummary {
  fieldId: string;
  fieldName: string;
  environmentType: string;
  isReporting: boolean;
  ts: string | null;
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  lightIntensity: number | null;
}

/**
 * A farmer's own record: their fields, whether they are actually reporting,
 * and how their advisory and community activity is going. A different
 * question from the admin's platform summary or another farmer's fields, so
 * it is computed here rather than filtered from either.
 */
export interface IFarmerOverview {
  fields: {
    total: number;
    active: number;
    /** Reported a reading in the last 10 minutes. */
    reporting: number;
  };
  advisories: { total: number; active: number; resolved: number };
  community: { posts: number; comments: number; followers: number; following: number };
  latestByField: IFarmerFieldSummary[];
  /** 24h trend averaged across every field the farmer owns. */
  trend: ITelemetryBucket[];
}
