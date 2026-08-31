import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { setupAdvisorySocket } from "./app/modules/advisorySession/advisorySession.socket";
import { setupTelemetrySocket } from "./app/socket/telemetrySocket";
import { initializeMqttClient } from "./app/modules/sensorData/mqtt.service";
import { seedAdmin } from "./app/utils/seedAdmin";

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.client_origin, // Next.js frontend
    methods: ["GET", "POST"],
  },
});

// Setup chat-specific Socket.IO logic
setupAdvisorySocket(io);
setupTelemetrySocket(io);

async function main() {
  try {
    const conn = await mongoose.connect(config.database_url as string);
    if (conn) {
      console.log("\nMongoDB Database connected..");
    }

    await seedAdmin();

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
