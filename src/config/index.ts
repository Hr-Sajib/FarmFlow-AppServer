import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '5100', 10),
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  default_password: process.env.DEFAULT_PASS || undefined,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  
  influxDB_url: process.env.INFLUXDB_URL,
  influxDB_token: process.env.INFLUXDB_TOKEN,
  influxDB_org: process.env.INFLUXDB_ORG,
  influxDB_bucket: process.env.INFLUXDB_BUCKET,

  gemini_api_key : process.env.GEMINI_API_KEY,

  mqtt_broker: process.env.MQTT_BROKER,
  mqtt_port: parseInt(process.env.MQTT_PORT || '8883', 10),
  mqtt_topic: process.env.MQTT_TOPIC,
  mqtt_username: process.env.MQTT_USERNAME,
  mqtt_password: process.env.MQTT_PASSWORD,

};