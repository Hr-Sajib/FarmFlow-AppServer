/** Series identity. Everything here is indexed; the readings below are not. */
export interface ITelemetryMeta {
  farmerId: string;
  fieldId: string;
  deviceId?: string;
}

export interface ITelemetry {
  ts: Date;
  meta: ITelemetryMeta;
  temperature?: number;
  humidity?: number;
  soilMoisture?: number;
  lightIntensity?: number;
}

/** Windows the API accepts for historical reads. */
export type TTelemetryRange = "1h" | "24h" | "7d" | "30d" | "90d";

/** One downsampled bucket returned to charts. */
export interface ITelemetryBucket {
  ts: Date;
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  lightIntensity: number | null;
  samples: number;
}
