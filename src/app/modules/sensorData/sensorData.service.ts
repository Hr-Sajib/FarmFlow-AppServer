import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { influxClient } from '../../../server';
import config from '../../../config';
import { ISensorData } from './sensorData.interface';


// Variable to hold the Write API, initialized lazily
let writeApi: WriteApi | null = null;
// Variable to hold the Query API, initialized lazily
let queryApi: QueryApi | null = null;

// Function to initialize the Write API
const initializeWriteApi = (): WriteApi => {
  if (!influxClient) {
    throw new Error('InfluxDB client not initialized in server.ts');
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
    throw new Error('InfluxDB client not initialized in server.ts');
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
      throw new Error('Invalid timestamp format');
    }

    const point = new Point('sensor_reading')
      .stringField('farmerId', data.farmerId)
      .stringField('fieldId', data.fieldId)
      .floatField('temperature', data.temperature)
      .floatField('humidity', data.humidity)
      .floatField('soil_moisture', data.soil_moisture)
      .floatField('light_intensity', data.light_intensity)
      .timestamp(timestamp);

    console.log("In service: ", point);

    api.writePoint(point);
    await api.flush(); // Ensure data is written immediately
    console.log(`Inserted sensor data: ${point.toString()}`);
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    throw new Error('Failed to insert sensor data');
  }
};

// Fetch all sensor data from InfluxDB
export const fetchAllSensorData = async (): Promise<ISensorData[]> => {
  const api = initializeQueryApi();

  try {
    // Flux query to fetch all sensor data
    const fluxQuery = `
      from(bucket: "${config.influxDB_bucket}")
        |> range(start: 2025-01-01T00:00:00Z, stop: 2025-12-31T23:59:59Z)
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "soil_moisture" or r._field == "light_intensity")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    console.log("Executing Flux query:", fluxQuery);

    const result: ISensorData[] = [];
    const rows = await api.collectRows(fluxQuery);

    for (const row of rows as any[]) {
      const sensorData: ISensorData = {
        farmerId: row.farmerId,
        fieldId: row.fieldId,
        temperature: row.temperature,
        humidity: row.humidity,
        soil_moisture: row.soil_moisture,
        light_intensity: row.light_intensity,
        timeStamp: new Date(row._time),
      };
      result.push(sensorData);
    }

    console.log(`Fetched ${result.length} sensor data points`);
    return result;
  } catch (error) {
    console.error('Error querying InfluxDB:', error);
    throw new Error('Failed to fetch sensor data');
  }
};