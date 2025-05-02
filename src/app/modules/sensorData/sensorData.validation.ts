import { z } from "zod";

const SensorDataValidationSchema = z.object({
  body: z.object({
    farmerId: z.string().min(1, { message: 'Farmer ID is required' }),
    fieldId: z.string().min(1, { message: 'Field ID is required' }),
    temperature: z.number().min(-50).max(150),
    humidity: z.number().min(0).max(100),
    soil_moisture: z.number().min(0).max(100),
    light_intensity: z.number().min(0).max(100000),
    timeStamp: z.string() // Accept a string
      .transform((val) => new Date(val)) // Transform it to a Date object
      .refine((date) => !isNaN(date.getTime()), { message: 'Invalid timestamp format' }) // Validate it’s a valid date
  })
});

export const sensorDataValidations = { SensorDataValidationSchema };
