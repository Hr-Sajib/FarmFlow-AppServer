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
exports.getAllSensorData = exports.insertSensorDataPoint = void 0;
const sensorData_service_1 = require("./sensorData.service");
const mqtt_service_1 = require("./mqtt.service");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
// Initialize MQTT client on module load
(0, mqtt_service_1.initializeMqttClient)();
// Insert a new sensor data point (HTTP handler)
exports.insertSensorDataPoint = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sensorData = req.body;
    yield (0, sensorData_service_1.insertSensorData)(sensorData);
    (0, sendResponse_1.default)(res, {
        statusCode: 201,
        success: true,
        message: 'Sensor data inserted successfully',
        data: sensorData,
    });
}));
// Fetch all sensor data, optionally filtered by farmerId, fieldId, time=latest, and measurement
exports.getAllSensorData = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { farmerId, fieldId, time, ms } = req.query;
    // Validate that both farmerId and fieldId are provided together
    if ((farmerId && !fieldId) || (!farmerId && fieldId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Both farmerId and fieldId must be provided together');
    }
    // Validate time parameter
    if (time && time !== 'latest') {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid time parameter. Only "latest" is supported');
    }
    // Validate measurement parameter
    if (ms && (typeof ms !== 'string' || !ms.trim())) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid measurement parameter. Must be a non-empty string');
    }
    const sensorData = yield (0, sensorData_service_1.fetchAllSensorData)(farmerId, fieldId, time === 'latest', ms);
    const measurement = ms || 'sensor_reading';
    const message = farmerId && fieldId
        ? `Sensor data fetched successfully from ${measurement} for farmerId=${farmerId}, fieldId=${fieldId}${time === 'latest' ? ' (latest)' : ''}`
        : `Sensor data fetched successfully from ${measurement}${time === 'latest' ? ' (latest)' : ''}`;
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message,
        data: sensorData,
    });
}));
