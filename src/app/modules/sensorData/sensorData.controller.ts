
// sensorData.controller.ts 
import { Request, Response } from 'express';
import { fetchAllSensorData, insertSensorData } from './sensorData.service';
import { ISensorData } from './sensorData.interface';
import { initializeMqttClient } from './mqtt.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

// Initialize MQTT client on module load
initializeMqttClient();

// Insert a new sensor data point (HTTP handler)
export const insertSensorDataPoint = catchAsync(
  async (req: Request, res: Response) => {
    const sensorData = req.body as ISensorData;
    await insertSensorData(sensorData);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Sensor data inserted successfully',
      data: sensorData,
    });
  }
);

// Fetch all sensor data, optionally filtered by farmerId, fieldId, time=latest, and measurement
export const getAllSensorData = catchAsync(
  async (req: Request, res: Response) => {
    const { farmerId, fieldId, time, ms } = req.query;

    // Validate that both farmerId and fieldId are provided together
    if ((farmerId && !fieldId) || (!farmerId && fieldId)) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Both farmerId and fieldId must be provided together');
    }

    // Validate time parameter
    if (time && time !== 'latest') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid time parameter. Only "latest" is supported');
    }

    // Validate measurement parameter
    if (ms && (typeof ms !== 'string' || !ms.trim())) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid measurement parameter. Must be a non-empty string');
    }

    const sensorData = await fetchAllSensorData(
      farmerId as string | undefined,
      fieldId as string | undefined,
      time === 'latest',
      ms as string | undefined
    );

    const measurement = ms || 'sensor_reading';
    const message = farmerId && fieldId
      ? `Sensor data fetched successfully from ${measurement} for farmerId=${farmerId}, fieldId=${fieldId}${time === 'latest' ? ' (latest)' : ''}`
      : `Sensor data fetched successfully from ${measurement}${time === 'latest' ? ' (latest)' : ''}`;

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message,
      data: sensorData,
    });
  }
);