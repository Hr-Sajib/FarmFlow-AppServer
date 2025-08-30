"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes 
const express_1 = __importDefault(require("express"));
const sensorData_controller_1 = require("./sensorData.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const sensorData_validation_1 = require("./sensorData.validation");
const sensorRoutes = express_1.default.Router();
// Route to insert sensor data (POST)
sensorRoutes.post('/', (0, validateRequest_1.default)(sensorData_validation_1.sensorDataValidations.SensorDataValidationSchema), sensorData_controller_1.insertSensorDataPoint);
// Route to fetch all sensor data (GET)
sensorRoutes.get('/', sensorData_controller_1.getAllSensorData);
exports.default = sensorRoutes;
