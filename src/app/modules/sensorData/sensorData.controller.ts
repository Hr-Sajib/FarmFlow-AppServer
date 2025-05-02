import { Request, Response } from 'express';
import mqtt from 'mqtt';
import config from '../../../config';
import { insertSensorData, fetchAllSensorData } from './sensorData.service';
import { ISensorData } from './sensorData.interface';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

// Singleton MQTT client instance
let mqttClient: mqtt.MqttClient | null = null;

// Initialize MQTT client
const initializeMqttClient = () => {
  if (mqttClient) {
    console.log('MQTT client already initialized');
    return; // Prevent multiple connections
  }

  console.log('Initializing MQTT client with config:', {
    broker: config.mqtt_broker,
    port: config.mqtt_port,
    topic: config.mqtt_topic,
    username: config.mqtt_username ? '****' : undefined, // Mask username for logging
    password: config.mqtt_password ? '****' : undefined, // Mask password for logging
  });

  // MQTT configuration from config file
  const options: mqtt.IClientOptions = {
    port: config.mqtt_port,
    username: config.mqtt_username,
    password: config.mqtt_password,
    protocol: 'mqtts', // Secure MQTT protocol
    rejectUnauthorized: true, // Enable SSL/TLS certificate verification
    keepalive: 60, // Keep connection alive
    reconnectPeriod: 1000, // Reconnect after 1 second if disconnected
    connectTimeout: 30 * 1000, // 30 seconds timeout for initial connection
  };

  // Create MQTT client
  try {
    mqttClient = mqtt.connect(config.mqtt_broker as string, options);
    console.log('MQTT client connection initiated');
  } catch (error) {
    console.error('Failed to initiate MQTT client:', error);
    mqttClient = null;
    return;
  }

  // Handle MQTT connection
  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient!.subscribe(config.mqtt_topic as string, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`Subscribed to topic: ${config.mqtt_topic}`);
      } else {
        console.error(`Failed to subscribe to topic: ${config.mqtt_topic}`, err);
      }
    });
  });

  // Handle incoming MQTT messages
  mqttClient.on('message', async (topic, message) => {
    try {
      let dataString = message.toString();
      console.log(`Received message on topic '${topic}': ${dataString}`);

      // Fix single quotes to double quotes for valid JSON
      dataString = dataString.replace(/'/g, '"');

      // Parse the incoming message
      let sensorData: ISensorData;
      try {
        sensorData = JSON.parse(dataString) as ISensorData;
      } catch (parseError) {
        console.error('Failed to parse MQTT message as JSON:', parseError, 'Raw message:', dataString);
        return;
      }

      // Log parsed data
      console.log('Parsed sensor data:', sensorData);

      // Validate sensorData
      if (!sensorData || typeof sensorData !== 'object') {
        console.error('Invalid sensor data format:', sensorData);
        return;
      }

      // Insert data into InfluxDB
      await insertSensorData(sensorData);
      console.log('Sensor data inserted successfully:', sensorData);
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  // Handle MQTT errors
  mqttClient.on('error', (err) => {
    console.error('MQTT client error:', err);
    mqttClient = null; // Reset client to allow reconnection
  });

  // Handle client close
  mqttClient.on('close', () => {
    console.log('Disconnected from MQTT broker');
    mqttClient = null; // Reset client to allow reconnection
  });

  // Handle reconnection attempts
  mqttClient.on('reconnect', () => {
    console.log('Attempting to reconnect to MQTT broker');
  });
};

// Initialize MQTT client immediately on module load
initializeMqttClient();

// Insert a new sensor data point (HTTP handler)
export const insertSensorDataPoint = catchAsync(
  async (req: Request, res: Response) => {
    // Handle HTTP request
    const sensorData = req.body as ISensorData;
    await insertSensorData(sensorData);

    // Send standardized response
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Sensor data inserted successfully',
      data: sensorData,
    });
  }
);

// Fetch all sensor data
export const getAllSensorData = catchAsync(
  async (req: Request, res: Response) => {
    const sensorData = await fetchAllSensorData();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Sensor data fetched successfully',
      data: sensorData,
    });
  }
);

