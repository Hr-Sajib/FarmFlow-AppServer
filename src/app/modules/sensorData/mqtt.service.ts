// mqtt.service.ts 

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { insertDataToInfluxDB } from './sensorData.service';
import config from '../../../config';

// Interface for topic configuration
interface TopicConfig {
  topic: string;
  measurement: string;
  parser: (message: string) => any; // Function to parse message into data
}

// MQTT topic configurations
const topicConfigs: TopicConfig[] = [
  {
    topic: 'topic_farmer1',
    measurement: 'ms_farmer1',
    parser: (message: string) => {
      const cleanedMessage = message.replace(/'/g, '"'); // Fix single quotes
      return JSON.parse(cleanedMessage);
    },
  },
  {
    topic: 'topic_farmer2',
    measurement: 'ms_farmer2',
    parser: (message: string) => {
      const cleanedMessage = message.replace(/'/g, '"');
      return JSON.parse(cleanedMessage);
    },
  },
];

// Singleton MQTT client instance
let mqttClient: MqttClient | null = null;

// Initialize MQTT client and subscribe to configured topics
export const initializeMqttClient = (): void => {
  if (mqttClient) {
    console.log('MQTT client already initialized');
    return;
  }

  console.log('Initializing MQTT client with config:', {
    broker: config.mqtt_broker,
    port: config.mqtt_port,
    topics: topicConfigs.map((t) => t.topic),
    username: config.mqtt_username ? '****' : undefined,
    password: config.mqtt_password ? '****' : undefined,
  });

  const options: IClientOptions = {
    port: config.mqtt_port,
    username: config.mqtt_username,
    password: config.mqtt_password,
    protocol: 'mqtts',
    rejectUnauthorized: true,
    keepalive: 60,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  };

  try {
    mqttClient = mqtt.connect(config.mqtt_broker as string, options);
    console.log('MQTT client connection initiated');
  } catch (error) {
    console.error('Failed to initiate MQTT client:', error);
    mqttClient = null;
    return;
  }

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    topicConfigs.forEach(({ topic }) => {
      mqttClient!.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`Subscribed to topic: ${topic}`);
        } else {
          console.error(`Failed to subscribe to topic: ${topic}`, err);
        }
      });
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const messageString = message.toString();
      // console.log(`Received message on topic '${topic}': ${messageString}`);

      // Find the topic configuration
      const topicConfig = topicConfigs.find((config) => config.topic === topic);
      if (!topicConfig) {
        console.error(`No configuration found for topic: ${topic}`);
        return;
      }

      // Parse the message
      let data: any;
      try {
        data = topicConfig.parser(messageString);
      } catch (parseError) {
        console.error(`Failed to parse message for topic ${topic}:`, parseError, 'Raw message:', messageString);
        return;
      }

      // Log parsed data
      // console.log(`Parsed data for topic ${topic}:`, data);

      // Insert data into InfluxDB
      await insertDataToInfluxDB(topicConfig.measurement, data);
      console.log(`Data inserted successfully for topic ${topic} into measurement ${topicConfig.measurement}:`, data);
    } catch (error) {
      console.error(`Error processing message for topic ${topic}:`, error);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT client error:', err);
    mqttClient = null;
  });

  mqttClient.on('close', () => {
    console.log('Disconnected from MQTT broker');
    mqttClient = null;
  });

  mqttClient.on('reconnect', () => {
    console.log('Attempting to reconnect to MQTT broker');
  });
};

// Get the current MQTT client instance (for testing or manual interaction)
export const getMqttClient = (): MqttClient | null => mqttClient;