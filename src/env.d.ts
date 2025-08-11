declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    PORT?: string;
    DATABASE_URL: string;
    BCRYPT_SALT_ROUNDS?: string;
    DEFAULT_PASS?: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    INFLUXDB_URL: string;
    INFLUXDB_TOKEN: string;
    INFLUXDB_ORG: string;
    INFLUXDB_BUCKET: string;
    MQTT_BROKER: string;
    MQTT_PORT?: string;
    MQTT_TOPIC: string;
    MQTT_USERNAME: string;
    MQTT_PASSWORD: string;
    GEMINI_API_KEY: string;
    GROQ_API_KEY: string
  }
}