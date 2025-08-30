"use strict";
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
exports.influxClient = void 0;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const influxdb_client_1 = require("@influxdata/influxdb-client");
const influxdb_client_apis_1 = require("@influxdata/influxdb-client-apis");
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const chat_socket_1 = require("./app/modules/chat/chat.socket");
const mqtt_service_1 = require("./app/modules/sensorData/mqtt.service");
// Initialize InfluxDB client
exports.influxClient = new influxdb_client_1.InfluxDB({
    url: config_1.default.influxDB_url,
    token: config_1.default.influxDB_token,
});
const httpServer = (0, http_1.createServer)(app_1.default);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000', // Restrict to Next.js frontend
        methods: ['GET', 'POST'],
    },
});
// Setup chat-specific Socket.IO logic
(0, chat_socket_1.setupChatSocket)(io);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conn = yield mongoose_1.default.connect(config_1.default.database_url);
            if (conn) {
                console.log('\nMongoDB Database connected..');
            }
            const orgsApi = new influxdb_client_apis_1.OrgsAPI(exports.influxClient);
            yield orgsApi.getOrgs({ org: config_1.default.influxDB_org });
            console.log('InfluxDB Database connected..');
            // Initialize MQTT client
            (0, mqtt_service_1.initializeMqttClient)();
            // Start the HTTP & WebSocket server
            httpServer.listen(config_1.default.port, () => {
                console.log(`Farm-Flow app server & Socket.IO listening on port ${config_1.default.port}`);
            });
        }
        catch (err) {
            console.error('Failed to connect to databases:', err);
            process.exit(1);
        }
    });
}
main();
// import config from "./config";
// import mongoose from 'mongoose';
// import app from "./app";
// import { InfluxDB } from '@influxdata/influxdb-client';
// import { OrgsAPI } from '@influxdata/influxdb-client-apis';
// import { initializeMqttClient } from "./app/modules/sensorData/mqtt.service";
// import http from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// // Initialize InfluxDB client
// const influxClient = new InfluxDB({
//   url: config.influxDB_url as string,
//   token: config.influxDB_token as string,
// });
// const server = http.createServer(app);
// // 🔌 Initialize Socket.IO
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: "*", // change this for production
//   },
// });
// // Make `io` available globally (or pass to modules as needed)
// export { influxClient, io };
// async function main() {
//   try {
//     const conn = await mongoose.connect(config.database_url as string);
//     if (conn) {
//       console.log("\nMongoDB Database connected..");
//     }
//     const orgsApi = new OrgsAPI(influxClient);
//     await orgsApi.getOrgs({ org: config.influxDB_org as string });
//     console.log("InfluxDB Database connected..");
//     // ✅ Initialize MQTT client with Socket.IO
//     initializeMqttClient();
//     // 🟢 Start the HTTP & WebSocket server
//     server.listen(config.port, () => {
//       console.log(`Farm-Flow app server & Socket.IO listening on port ${config.port}`);
//     });
//   } catch (err) {
//     console.error("Failed to connect to databases:", err);
//     process.exit(1);
//   }
// }
// main();
