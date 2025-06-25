export interface IField {
  fieldId: string
  fieldName: string;
  fieldImage: string;
  fieldCrop: string; 
  fieldLocation: {
    latitude: number;
    longitude: number;
  };
  fieldSizeInAcres?: number; 
  soilType?: 'clay' | 'loam' | 'sandy' | 'silt' | 'peat' | 'chalk' | 'saline';
  farmerId: string; 
  region?: string; 
  fieldStatus?: "active" | "inactive" | "maintenance";
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted:boolean;
}
