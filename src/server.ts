import config from "./config";
import mongoose from 'mongoose';
import app from "./app";
import { InfluxDB } from '@influxdata/influxdb-client';
import { OrgsAPI } from '@influxdata/influxdb-client-apis';

// Initialize InfluxDB client
const influxClient = new InfluxDB({
    url: config.influxDB_url as string,
    token: config.influxDB_token as string,
});

async function main() {
    try {
        // Connect to MongoDB
        const conn = await mongoose.connect(config.database_url as string);
        if (conn) {
            console.log("\nMongoDB Database connected..");
        }

        // Verify InfluxDB connection by checking the organization
        const orgsApi = new OrgsAPI(influxClient);
        await orgsApi.getOrgs({ org: config.influxDB_org as string });
        console.log("InfluxDB Database connected..");

        // Start the Express server
        app.listen(config.port, () => {
            console.log(`Farm-Flow app server listening on port ${config.port}`);
        });
    } catch (err) {
        console.error("Failed to connect to databases:", err);
        process.exit(1); // Exit the process with failure code
    }
}

// Export the InfluxDB client for use in other modules
export { influxClient };

main();