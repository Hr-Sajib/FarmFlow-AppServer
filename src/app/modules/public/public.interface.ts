/**
 * What an anonymous visitor is allowed to see.
 *
 * Deliberately not a subset of ITelemetry: no farmerId, no fieldId, no
 * coordinates and no device id. `label` is a generated display name, so
 * nothing here can be joined back to a real farm or person.
 */
export interface IPublicReading {
  label: string;
  ts: Date;
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  lightIntensity: number | null;
}

/** Platform-wide counters for the landing page. No per-farm breakdown. */
export interface IPublicStats {
  fieldsMonitored: number;
  readingsLast24h: number;
  advisorySessionsResolved: number;
  verifiedExperts: number;
}
