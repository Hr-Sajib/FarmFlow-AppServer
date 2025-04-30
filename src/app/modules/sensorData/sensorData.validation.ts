import { z } from 'zod';
import { ISensorData } from './sensorData.interface';


export const SensorDataSchema = z.object({
  farmerId: z.string().min(1, { message: 'Farmer ID is required' }),
  fieldId: z.string().min(1, { message: 'Field ID is required' }),
  temperature: z.number().min(-50).max(150, { message: 'Temperature must be between -50 and 150°C' }),
  humidity: z.number().min(0).max(100, { message: 'Humidity must be between 0 and 100%' }),
  soil_moisture: z.number().min(0).max(100, { message: 'Soil moisture must be between 0 and 100%' }),
  light_intensity: z.number().min(0).max(100000, { message: 'Light intensity must be between 0 and 100,000 lux' }),
  timeStamp: z.date().optional().default(() => new Date()),
});

export const validateSensorData = (data: unknown): ISensorData => {
  return SensorDataSchema.parse(data);
};