import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import { influxClient } from '../../../server';
import config from '../../../config';
import { ISensorData } from './sensorData.interface';

// Variable to hold the Write API, initialized lazily
let writeApi: WriteApi | null = null;

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

// Write sensor data to InfluxDB
export const insertSensorData = async (data: ISensorData): Promise<void> => {
  const api = initializeWriteApi();

  try {
    const point = new Point('sensor_reading')
      .tag('farmerId', data.farmerId)
      .tag('fieldId', data.fieldId)
      .floatField('temperature', data.temperature)
      .floatField('humidity', data.humidity)
      .floatField('soil_moisture', data.soil_moisture)
      .floatField('light_intensity', data.light_intensity)
      .timestamp(data.timeStamp || new Date());

    api.writePoint(point);
    await api.flush(); // Ensure data is written immediately (optional for production)
    console.log(`Inserted sensor data: ${point.toString()}`);
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    throw new Error('Failed to insert sensor data');
  }
};