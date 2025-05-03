import { Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { influxClient } from '../../../server';
import config from '../../../config';
import { ISensorData } from './sensorData.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

// Variable to hold the Write API, initialized lazily
let writeApi: WriteApi | null = null;
// Variable to hold the Query API, initialized lazily
let queryApi: QueryApi | null = null;

// Function to initialize the Write API
const initializeWriteApi = (): WriteApi => {
  if (!influxClient) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'InfluxDB client not initialized in server.ts');
  }
  if (!writeApi) {
    writeApi = influxClient.getWriteApi(
      config.influxDB_org as string,
      config.influxDB_bucket as string,
      'ms' // Precision: milliseconds
    );

    // Gracefully close the write API on app shutdown
    process.on('SIGTERM', async () => {
      if (writeApi) {
        await writeApi.close();
        console.log('InfluxDB write API closed');
      }
      process.exit(0);
    });
  }
  return writeApi;
};

// Function to initialize the Query API
const initializeQueryApi = (): QueryApi => {
  if (!influxClient) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'InfluxDB client not initialized in server.ts');
  }
  if (!queryApi) {
    queryApi = influxClient.getQueryApi(config.influxDB_org as string);
  }
  return queryApi;
};

// Write sensor data to InfluxDB
export const insertSensorData = async (data: ISensorData): Promise<void> => {
  const api = initializeWriteApi();

  try {
    // Ensure timeStamp is a Date object
    const timestamp = typeof data.timeStamp === 'string' ? new Date(data.timeStamp) : data.timeStamp;
    if (isNaN(timestamp!.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid timestamp format');
    }

    const point = new Point('sensor_reading')
      .stringField('farmerId', data.farmerId)
      .stringField('fieldId', data.fieldId)
      .floatField('temperature', data.temperature)
      .floatField('humidity', data.humidity)
      .floatField('soil_moisture', data.soil_moisture)
      .floatField('light_intensity', data.light_intensity)
      .timestamp(timestamp);

    console.log('In service, writing point:', point.toString());

    api.writePoint(point);
    await api.flush(); // Ensure data is written immediately
    console.log(`Inserted sensor data: ${point.toString()}`);
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to insert sensor data');
  }
};

// Fetch all sensor data from InfluxDB, optionally filtered by farmerId and fieldId
export const fetchAllSensorData = async (farmerId?: string, fieldId?: string): Promise<ISensorData[]> => {
  const api = initializeQueryApi();

  try {
    console.log('InfluxDB query config:', {
      bucket: config.influxDB_bucket,
      org: config.influxDB_org,
      farmerId: farmerId || 'none',
      fieldId: fieldId || 'none',
    });

    // Flux query to fetch all sensor data
    const fluxQuery = `
      from(bucket: "${config.influxDB_bucket}")
        |> range(start: -1y)
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "soil_moisture" or r._field == "light_intensity" or r._field == "farmerId" or r._field == "fieldId")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    console.log('Executing Flux query for all data:', fluxQuery);

    const result: ISensorData[] = [];
    const rows = await api.collectRows(fluxQuery);

    console.log('Raw rows from InfluxDB (all data):', rows);

    for (const row of rows as any[]) {
      try {
        const sensorData: ISensorData = {
          farmerId: row.farmerId,
          fieldId: row.fieldId, // Fixed bug: was incorrectly using row.farmerId
          temperature: row.temperature,
          humidity: row.humidity,
          soil_moisture: row.soil_moisture,
          light_intensity: row.light_intensity,
          timeStamp: new Date(row._time),
        };
        result.push(sensorData);
      } catch (error) {
        console.error('Error parsing row (all data):', row, error);
      }
    }

    // Filter results in code if farmerId and fieldId are provided
    let filteredResult = result;
    if (farmerId && fieldId) {
      filteredResult = result.filter(
        (data) => data.farmerId === farmerId && data.fieldId === fieldId
      );
      console.log(`Filtered ${filteredResult.length} sensor data points for farmerId=${farmerId}, fieldId=${fieldId}`);
    } else {
      console.log(`Fetched ${result.length} sensor data points (all data)`);
    }

    return filteredResult;
  } catch (error) {
    console.error('Error querying InfluxDB (all data):', error);
    throw new AppError(httpStatus.NOT_FOUND, 'Failed to fetch sensor data');
  }
};


