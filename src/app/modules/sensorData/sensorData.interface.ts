export interface ISensorData {
    farmerId: string;
    fieldId: string; 
    temperature: number; 
    humidity: number;
    soil_moisture: number;
    light_intensity: number;
    timeStamp?: Date; 
  }

  