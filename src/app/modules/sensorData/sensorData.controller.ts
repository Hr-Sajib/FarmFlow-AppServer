import { Request, Response } from 'express';
import { insertSensorData } from './sensorData.service';
import { validateSensorData } from './sensorData.validation';

export const insertSensorDataPoint = async (req: Request, res: Response) => {
  try {
    // Validate the incoming data
    const sensorData = validateSensorData(req.body);

    // Insert the data into InfluxDB
    await insertSensorData(sensorData);

    res.status(201).json({
      success: true,
      message: 'Sensor data inserted successfully',
      data: sensorData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to insert sensor data',
      error: (error as Error).message,
    });
  }
};