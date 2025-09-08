import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import { InfluxDB } from "@influxdata/influxdb-client";
import { OrgsAPI } from "@influxdata/influxdb-client-apis";
import app from "./app";
import config from "./config";
import { setupChatSocket } from "./app/modules/chat/chat.socket";
import { initializeMqttClient } from "./app/modules/sensorData/mqtt.service";

// Initialize InfluxDB client
export const influxClient = new InfluxDB({
  url: config.influxDB_url as string,
  token: config.influxDB_token as string,
});

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Restrict to Next.js frontend
    methods: ["GET", "POST"],
  },
});

// Setup chat-specific Socket.IO logic
setupChatSocket(io);

async function main() {
  try {
    const conn = await mongoose.connect(config.database_url as string);
    if (conn) {
      console.log("\nMongoDB Database connected..");
    }

    const orgsApi = new OrgsAPI(influxClient);
    await orgsApi.getOrgs({ org: config.influxDB_org as string });
    console.log("InfluxDB Database connected..");

    // Initialize MQTT client
    initializeMqttClient();

    // Start the HTTP & WebSocket server
    httpServer.listen(config.port, "0.0.0.0", () => {
      console.log(
        `Farm-Flow app server & Socket.IO listening on http://0.0.0.0:${config.port}`
      );
    });
  } catch (err) {
    console.error("Failed to connect to databases:", err);
    process.exit(1);
  }
}

main();
