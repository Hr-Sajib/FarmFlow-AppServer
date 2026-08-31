import mqtt, { MqttClient, IClientOptions } from "mqtt";

import config from "../../../config";
import { sensorDataServices } from "./sensorData.service";
import { toTelemetry } from "./sensorData.utils";
import { broadcastTelemetry } from "../../socket/telemetrySocket";

/**
 * Topics carry no meaning any more — identity comes from farmerId/fieldId in
 * the payload. That removes the per-farmer topic/measurement mapping this file
 * used to hold, which could not scale past hardcoded farmers, and lets the real
 * firmware topic be subscribed alongside the simulator's.
 */
const SUBSCRIBED_TOPICS = [
  "sensors/data", // published by the ESP32 firmware
  "topic_farmer1", // published by the Python simulator
  "topic_farmer2",
];

let mqttClient: MqttClient | null = null;

/**
 * The simulator publishes Python dict repr, which uses single quotes and is not
 * valid JSON. Firmware publishes proper JSON, so this only normalises the
 * former.
 */
const parsePayload = (raw: string): Record<string, unknown> =>
  JSON.parse(raw.replace(/'/g, '"'));

export const initializeMqttClient = (): void => {
  if (mqttClient) return;

  const options: IClientOptions = {
    port: config.mqtt_port,
    username: config.mqtt_username,
    password: config.mqtt_password,
    protocol: "mqtts",
    rejectUnauthorized: true,
    keepalive: 60,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  };

  try {
    mqttClient = mqtt.connect(config.mqtt_broker as string, options);
  } catch (error) {
    console.error("MQTT: failed to initiate client:", error);
    mqttClient = null;
    return;
  }

  mqttClient.on("connect", () => {
    console.log("MQTT: connected to broker");
    mqttClient!.subscribe(SUBSCRIBED_TOPICS, { qos: 1 }, (err) => {
      if (err) console.error("MQTT: subscribe failed", err);
      else console.log(`MQTT: subscribed to ${SUBSCRIBED_TOPICS.join(", ")}`);
    });
  });

  mqttClient.on("message", async (topic, raw) => {
    try {
      const payload = parsePayload(raw.toString());
      const entry = toTelemetry(payload);

      if (!entry.meta.farmerId || !entry.meta.fieldId) {
        console.warn(`MQTT: dropping message on ${topic} with no farmerId/fieldId`);
        return;
      }

      await sensorDataServices.createTelemetryIntoDB(entry);

      // Push to anyone watching this farm. Stored first, so a dropped socket
      // never costs a reading.
      broadcastTelemetry(entry);
    } catch (error) {
      // A malformed message from one device must not stop the subscriber.
      console.error(
        `MQTT: failed to store message from ${topic}:`,
        error instanceof Error ? error.message : error
      );
    }
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT: client error:", err.message);
  });

  mqttClient.on("close", () => {
    console.log("MQTT: disconnected from broker");
  });
};

export const getMqttClient = (): MqttClient | null => mqttClient;
