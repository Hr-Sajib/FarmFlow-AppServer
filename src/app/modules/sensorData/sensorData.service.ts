
// sensorData.service.ts 

// // Service: Fetch all sensor data from InfluxDB, optionally filtered by farmerId and fieldId
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
      'ms'
    );

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

// Fetch all sensor data from InfluxDB, optionally filtered by farmerId, fieldId, time=latest, and measurement
export const fetchAllSensorData = async (
  farmerId?: string,
  fieldId?: string,
  latest?: boolean,
  measurement: string = 'sensor_reading'
): Promise<ISensorData[]> => {
  const api = initializeQueryApi();

  try {
    console.log('InfluxDB query config:', {
      bucket: config.influxDB_bucket,
      org: config.influxDB_org,
      farmerId: farmerId || 'none',
      fieldId: fieldId || 'none',
      latest: latest || false,
      measurement,
    });

    // Flux query to fetch sensor data from the specified measurement
    const fluxQuery = `
      from(bucket: "${config.influxDB_bucket}")
        |> range(start: -1y)
        |> filter(fn: (r) => r._measurement == "${measurement}")
        |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "soil_moisture" or r._field == "light_intensity" or r._field == "farmerId" or r._field == "fieldId")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    console.log('Executing Flux query:', fluxQuery);

    const result: ISensorData[] = [];
    const rows = await api.collectRows(fluxQuery);

    console.log(`Raw rows from InfluxDB (measurement: ${measurement}):`, rows);

    for (const row of rows as any[]) {
      try {
        // Parse timeStamp and validate
        const timeStamp = row._time ? new Date(row._time) : null;
        if (!timeStamp || isNaN(timeStamp.getTime())) {
          console.warn('Skipping row with invalid timeStamp:', row._time);
          continue;
        }

        const sensorData: ISensorData = {
          farmerId: row.farmerId,
          fieldId: row.fieldId,
          temperature: row.temperature,
          humidity: row.humidity,
          soil_moisture: row.soil_moisture,
          light_intensity: row.light_intensity,
          timeStamp: timeStamp,
        };
        result.push(sensorData);
      } catch (error) {
        console.error(`Error parsing row (measurement: ${measurement}):`, row, error);
      }
    }

    // Filter results in code if farmerId and fieldId are provided
    let filteredResult = result;
    if (farmerId && fieldId) {
      filteredResult = result.filter(
        (data) => data.farmerId === farmerId && data.fieldId === fieldId
      );
      console.log(`Filtered ${filteredResult.length} sensor data points for farmerId=${farmerId}, fieldId=${fieldId} from ${measurement}`);
    } else {
      console.log(`Fetched ${result.length} sensor data points from ${measurement}`);
    }

    // Return only the latest data point if latest is true
    if (latest) {
      if (filteredResult.length === 0) {
        console.log(`No data points available for latest filter in ${measurement}`);
        return [];
      }
      const latestData = filteredResult.reduce((latest, current) => {
        const latestTime = latest.timeStamp instanceof Date ? latest.timeStamp : new Date(latest.timeStamp!);
        const currentTime = current.timeStamp instanceof Date ? current.timeStamp : new Date(current.timeStamp!);
        return currentTime > latestTime ? current : latest;
      });
      console.log(`Returning latest data point from ${measurement}:`, latestData);
      return [latestData];
    }

    return filteredResult;
  } catch (error) {
    console.error(`Error querying InfluxDB (measurement: ${measurement}):`, error);
    throw new AppError(httpStatus.NOT_FOUND, `Failed to fetch sensor data from ${measurement}`);
  }
};

// Insert data to InfluxDB with dynamic measurement and fields
export const insertDataToInfluxDB = async (measurement: string, data: any): Promise<void> => {
  const api = initializeWriteApi();

  try {
    // Ensure timeStamp is a Date object
    const timestamp = data.timeStamp
      ? typeof data.timeStamp === 'string'
        ? new Date(data.timeStamp)
        : data.timeStamp
      : new Date(); // Default to current time if no timestamp
    if (isNaN(timestamp.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid timestamp format');
    }

    const point = new Point(measurement);

    // Dynamically add fields based on data
    for (const [key, value] of Object.entries(data)) {
      if (key === 'timeStamp') continue;
      if (typeof value === 'string') {
        point.stringField(key, value);
      } else if (typeof value === 'number') {
        point.floatField(key, value);
      } else if (typeof value === 'boolean') {
        point.booleanField(key, value);
      } else {
        console.warn(`Unsupported field type for ${key}:`, typeof value);
      }
    }

    point.timestamp(timestamp);

    // console.log('Writing point to InfluxDB:', point.toString());

    api.writePoint(point);
    await api.flush();
    console.log(`Inserted data into measurement ${measurement}:`, data);
  } catch (error) {
    console.error(`Error writing to InfluxDB for measurement ${measurement}:`, error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to insert data into ${measurement}`);
  }
};

// Backward-compatible insertSensorData for existing functionality
export const insertSensorData = async (data: ISensorData): Promise<void> => {
  await insertDataToInfluxDB('sensor_reading', data);
};