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
  motorOn: boolean;
  shadeOn: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  isDeleted: boolean;
}
