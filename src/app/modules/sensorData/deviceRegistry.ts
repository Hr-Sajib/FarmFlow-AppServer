import { FieldModel } from "../fields/fields.model";

/**
 * Translates the identifiers a device puts on the wire into application ids.
 *
 * The ESP32 firmware is frozen and publishes `farmerId: "fr1", fieldId: "fd1"`
 * — hardware labels chosen before fields had generated ids. Stored verbatim,
 * every reading from real hardware lands in a series no field points at, which
 * is why the dashboard was being fed by a seed script rather than by the
 * device. `IField.deviceId` is the mapping, and this resolves through it.
 *
 * Cached briefly because this runs on every published message, and the field
 * table changes far less often than readings arrive.
 */
type Identity = { farmerId: string; fieldId: string };

const TTL_MS = 60_000;
let cache = new Map<string, Identity>();
let loadedAt = 0;

const refresh = async (): Promise<void> => {
  const fields = await FieldModel.find({ isDeleted: false })
    .select("fieldId farmerId deviceId")
    .lean();

  const next = new Map<string, Identity>();
  for (const field of fields) {
    const identity = { farmerId: field.farmerId, fieldId: field.fieldId };
    // A field is reachable by its own id and by the device wired into it.
    next.set(field.fieldId, identity);
    if (field.deviceId) next.set(field.deviceId, identity);
  }

  cache = next;
  loadedAt = Date.now();
};

/**
 * Returns the real field identity for whatever the device called itself, or
 * null when nothing claims that device — in which case the reading is dropped
 * rather than stored, so orphan series never accumulate.
 */
export const resolveIdentity = async (
  reportedFieldId: string
): Promise<Identity | null> => {
  if (Date.now() - loadedAt > TTL_MS) {
    await refresh();
  }
  return cache.get(reportedFieldId) ?? null;
};

/** Forces the next resolve to reload — called when a field is created or edited. */
export const invalidateDeviceRegistry = (): void => {
  loadedAt = 0;
};
