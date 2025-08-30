"use strict";
// mqtt.service.ts 
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMqttClient = exports.initializeMqttClient = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const sensorData_service_1 = require("./sensorData.service");
const config_1 = __importDefault(require("../../../config"));
// MQTT topic configurations
const topicConfigs = [
    {
        topic: 'topic_farmer1',
        measurement: 'ms_farmer1',
        parser: (message) => {
            const cleanedMessage = message.replace(/'/g, '"'); // Fix single quotes
            return JSON.parse(cleanedMessage);
        },
    },
    {
        topic: 'topic_farmer2',
        measurement: 'ms_farmer2',
        parser: (message) => {
            const cleanedMessage = message.replace(/'/g, '"');
            return JSON.parse(cleanedMessage);
        },
    },
];
// Singleton MQTT client instance
let mqttClient = null;
// Initialize MQTT client and subscribe to configured topics
const initializeMqttClient = () => {
    if (mqttClient) {
        console.log('MQTT client already initialized');
        return;
    }
    console.log('Initializing MQTT client with config:', {
        broker: config_1.default.mqtt_broker,
        port: config_1.default.mqtt_port,
        topics: topicConfigs.map((t) => t.topic),
        username: config_1.default.mqtt_username ? '****' : undefined,
        password: config_1.default.mqtt_password ? '****' : undefined,
    });
    const options = {
        port: config_1.default.mqtt_port,
        username: config_1.default.mqtt_username,
        password: config_1.default.mqtt_password,
        protocol: 'mqtts',
        rejectUnauthorized: true,
        keepalive: 60,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };
    try {
        mqttClient = mqtt_1.default.connect(config_1.default.mqtt_broker, options);
        console.log('MQTT client connection initiated');
    }
    catch (error) {
        console.error('Failed to initiate MQTT client:', error);
        mqttClient = null;
        return;
    }
    mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
        topicConfigs.forEach(({ topic }) => {
            mqttClient.subscribe(topic, { qos: 1 }, (err) => {
                if (!err) {
                    console.log(`Subscribed to topic: ${topic}`);
                }
                else {
                    console.error(`Failed to subscribe to topic: ${topic}`, err);
                }
            });
        });
    });
    mqttClient.on('message', (topic, message) => __awaiter(void 0, void 0, void 0, function* () {
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
            let data;
            try {
                data = topicConfig.parser(messageString);
            }
            catch (parseError) {
                console.error(`Failed to parse message for topic ${topic}:`, parseError, 'Raw message:', messageString);
                return;
            }
            // Log parsed data
            // console.log(`Parsed data for topic ${topic}:`, data);
            // Insert data into InfluxDB
            yield (0, sensorData_service_1.insertDataToInfluxDB)(topicConfig.measurement, data);
            console.log(`Data inserted successfully for topic ${topic} into measurement ${topicConfig.measurement}:`, data);
        }
        catch (error) {
            console.error(`Error processing message for topic ${topic}:`, error);
        }
    }));
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
exports.initializeMqttClient = initializeMqttClient;
// Get the current MQTT client instance (for testing or manual interaction)
const getMqttClient = () => mqttClient;
exports.getMqttClient = getMqttClient;
