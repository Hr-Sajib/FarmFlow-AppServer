import express from 'express';
import { insertSensorDataPoint } from './sensorData.controller';

const sensorRoutes = express.Router();

// Route to insert sensor data
sensorRoutes.post('/', insertSensorDataPoint);

export default sensorRoutes;