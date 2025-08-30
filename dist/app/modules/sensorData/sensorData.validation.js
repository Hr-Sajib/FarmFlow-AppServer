"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensorDataValidations = void 0;
const zod_1 = require("zod");
const SensorDataValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        farmerId: zod_1.z.string().min(1, { message: 'Farmer ID is required' }),
        fieldId: zod_1.z.string().min(1, { message: 'Field ID is required' }),
        temperature: zod_1.z.number().min(-50).max(150),
        humidity: zod_1.z.number().min(0).max(100),
        soil_moisture: zod_1.z.number().min(0).max(100),
        light_intensity: zod_1.z.number().min(0).max(100000),
        timeStamp: zod_1.z.string() // Accept a string
            .transform((val) => new Date(val)) // Transform it to a Date object
            .refine((date) => !isNaN(date.getTime()), { message: 'Invalid timestamp format' }) // Validate it’s a valid date
    })
});
exports.sensorDataValidations = { SensorDataValidationSchema };
