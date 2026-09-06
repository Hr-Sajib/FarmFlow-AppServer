export type TSoilType =
  | "clay"
  | "loam"
  | "sandy"
  | "silt"
  | "peat"
  | "chalk"
  | "saline";

export type TFieldStatus = "active" | "inactive" | "maintenance";

/**
 * Soil composition for this field's coordinates, from ISRIC SoilGrids.
 * Fetched once when the location is set and re-fetched only when it moves —
 * not on every read — so the field detail page can show it without waiting
 * on an external call.
 */
export interface IFieldSoilProfile {
  clay: number;
  silt: number;
  sand: number;
  ph: number;
  organicCarbon: number;
  fetchedAt: Date;
}

/**
 * Controlled environments are the platform's primary target: they are where
 * sensor→actuator loops actually close, and where high-value crops justify
 * the hardware.
 */
export type TEnvironmentType = "open_field" | "greenhouse" | "net_house";

export interface IField {
  fieldId: string;
  fieldName: string;
  fieldImage: string;
  fieldCrop: string;
  fieldLocation: {
    latitude: number;
    longitude: number;
  };
  fieldSizeInAcres?: number;
  soilType?: TSoilType;
  /** Server-computed from fieldLocation; never accepted from client input. */
  soilProfile?: IFieldSoilProfile | null;
  environmentType: TEnvironmentType;

  farmerId: string; // userCode of the owning farmer
  region?: string;
  fieldStatus?: TFieldStatus;

  /** Identifier of the ESP32 node serving this field; tags its telemetry. */
  deviceId?: string;

  /**
   * Desired actuator state, set when a farmer toggles a control. These record
   * what was *asked for* — the device does not acknowledge, so they are not
   * proof of the physical state. Reported state belongs to a later shadow model.
   */
  isMotorOn: boolean;
  isShadeOn: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  isDeleted: boolean;
}
