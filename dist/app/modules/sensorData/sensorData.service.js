"use strict";
// sensorData.service.ts 
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
exports.insertSensorData = exports.insertDataToInfluxDB = exports.fetchAllSensorData = void 0;
// // Service: Fetch all sensor data from InfluxDB, optionally filtered by farmerId and fieldId
const influxdb_client_1 = require("@influxdata/influxdb-client");
const server_1 = require("../../../server");
const config_1 = __importDefault(require("../../../config"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
// Variable to hold the Write API, initialized lazily
let writeApi = null;
// Variable to hold the Query API, initialized lazily
let queryApi = null;
// Function to initialize the Write API
const initializeWriteApi = () => {
    if (!server_1.influxClient) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'InfluxDB client not initialized in server.ts');
    }
    if (!writeApi) {
        writeApi = server_1.influxClient.getWriteApi(config_1.default.influxDB_org, config_1.default.influxDB_bucket, 'ms');
        process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
            if (writeApi) {
                yield writeApi.close();
                console.log('InfluxDB write API closed');
            }
            process.exit(0);
        }));
    }
    return writeApi;
};
// Function to initialize the Query API
const initializeQueryApi = () => {
    if (!server_1.influxClient) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'InfluxDB client not initialized in server.ts');
    }
    if (!queryApi) {
        queryApi = server_1.influxClient.getQueryApi(config_1.default.influxDB_org);
    }
    return queryApi;
};
// Fetch all sensor data from InfluxDB, optionally filtered by farmerId, fieldId, time=latest, and measurement
const fetchAllSensorData = (farmerId_1, fieldId_1, latest_1, ...args_1) => __awaiter(void 0, [farmerId_1, fieldId_1, latest_1, ...args_1], void 0, function* (farmerId, fieldId, latest, measurement = 'sensor_reading') {
    const api = initializeQueryApi();
    try {
        console.log('InfluxDB query config:', {
            bucket: config_1.default.influxDB_bucket,
            org: config_1.default.influxDB_org,
            farmerId: farmerId || 'none',
            fieldId: fieldId || 'none',
            latest: latest || false,
            measurement,
        });
        // Flux query to fetch sensor data from the specified measurement
        const fluxQuery = `
      from(bucket: "${config_1.default.influxDB_bucket}")
        |> range(start: -1y)
        |> filter(fn: (r) => r._measurement == "${measurement}")
        |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "soil_moisture" or r._field == "light_intensity" or r._field == "farmerId" or r._field == "fieldId")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;
        console.log('Executing Flux query:', fluxQuery);
        const result = [];
        const rows = yield api.collectRows(fluxQuery);
        console.log(`Raw rows from InfluxDB (measurement: ${measurement}):`, rows);
        for (const row of rows) {
            try {
                // Parse timeStamp and validate
                const timeStamp = row._time ? new Date(row._time) : null;
                if (!timeStamp || isNaN(timeStamp.getTime())) {
                    console.warn('Skipping row with invalid timeStamp:', row._time);
                    continue;
                }
                const sensorData = {
                    farmerId: row.farmerId,
                    fieldId: row.fieldId,
                    temperature: row.temperature,
                    humidity: row.humidity,
                    soil_moisture: row.soil_moisture,
                    light_intensity: row.light_intensity,
                    timeStamp: timeStamp,
                };
                result.push(sensorData);
            }
            catch (error) {
                console.error(`Error parsing row (measurement: ${measurement}):`, row, error);
            }
        }
        // Filter results in code if farmerId and fieldId are provided
        let filteredResult = result;
        if (farmerId && fieldId) {
            filteredResult = result.filter((data) => data.farmerId === farmerId && data.fieldId === fieldId);
            console.log(`Filtered ${filteredResult.length} sensor data points for farmerId=${farmerId}, fieldId=${fieldId} from ${measurement}`);
        }
        else {
            console.log(`Fetched ${result.length} sensor data points from ${measurement}`);
        }
        // Return only the latest data point if latest is true
        if (latest) {
            if (filteredResult.length === 0) {
                console.log(`No data points available for latest filter in ${measurement}`);
                return [];
            }
            const latestData = filteredResult.reduce((latest, current) => {
                const latestTime = latest.timeStamp instanceof Date ? latest.timeStamp : new Date(latest.timeStamp);
                const currentTime = current.timeStamp instanceof Date ? current.timeStamp : new Date(current.timeStamp);
                return currentTime > latestTime ? current : latest;
            });
            console.log(`Returning latest data point from ${measurement}:`, latestData);
            return [latestData];
        }
        return filteredResult;
    }
    catch (error) {
        console.error(`Error querying InfluxDB (measurement: ${measurement}):`, error);
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `Failed to fetch sensor data from ${measurement}`);
    }
});
exports.fetchAllSensorData = fetchAllSensorData;
// Insert data to InfluxDB with dynamic measurement and fields
const insertDataToInfluxDB = (measurement, data) => __awaiter(void 0, void 0, void 0, function* () {
    const api = initializeWriteApi();
    try {
        // Ensure timeStamp is a Date object
        const timestamp = data.timeStamp
            ? typeof data.timeStamp === 'string'
                ? new Date(data.timeStamp)
                : data.timeStamp
            : new Date(); // Default to current time if no timestamp
        if (isNaN(timestamp.getTime())) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid timestamp format');
        }
        const point = new influxdb_client_1.Point(measurement);
        // Dynamically add fields based on data
        for (const [key, value] of Object.entries(data)) {
            if (key === 'timeStamp')
                continue;
            if (typeof value === 'string') {
                point.stringField(key, value);
            }
            else if (typeof value === 'number') {
                point.floatField(key, value);
            }
            else if (typeof value === 'boolean') {
                point.booleanField(key, value);
            }
            else {
                console.warn(`Unsupported field type for ${key}:`, typeof value);
            }
        }
        point.timestamp(timestamp);
        // console.log('Writing point to InfluxDB:', point.toString());
        api.writePoint(point);
        yield api.flush();
        console.log(`Inserted data into measurement ${measurement}:`, data);
    }
    catch (error) {
        console.error(`Error writing to InfluxDB for measurement ${measurement}:`, error);
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Failed to insert data into ${measurement}`);
    }
});
exports.insertDataToInfluxDB = insertDataToInfluxDB;
// Backward-compatible insertSensorData for existing functionality
const insertSensorData = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, exports.insertDataToInfluxDB)('sensor_reading', data);
});
exports.insertSensorData = insertSensorData;
