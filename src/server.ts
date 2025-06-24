import config from "./config";
import mongoose from 'mongoose';
import app from "./app";
import { InfluxDB } from '@influxdata/influxdb-client';
import { OrgsAPI } from '@influxdata/influxdb-client-apis';
import { initializeMqttClient } from "./app/modules/sensorData/mqtt.service";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Initialize InfluxDB client
const influxClient = new InfluxDB({
  url: config.influxDB_url as string,
  token: config.influxDB_token as string,
});

const server = http.createServer(app);

// 🔌 Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // change this for production
  },
});

// Make `io` available globally (or pass to modules as needed)
export { influxClient, io };

async function main() {
  try {
    const conn = await mongoose.connect(config.database_url as string);
    if (conn) {
      console.log("\nMongoDB Database connected..");
    }

    const orgsApi = new OrgsAPI(influxClient);
    await orgsApi.getOrgs({ org: config.influxDB_org as string });
    console.log("InfluxDB Database connected..");

    // ✅ Initialize MQTT client with Socket.IO
    initializeMqttClient();

    // 🟢 Start the HTTP & WebSocket server
    server.listen(config.port, () => {
      console.log(`Farm-Flow app server & Socket.IO listening on port ${config.port}`);
    });
  } catch (err) {
    console.error("Failed to connect to databases:", err);
    process.exit(1);
  }
}

main();
