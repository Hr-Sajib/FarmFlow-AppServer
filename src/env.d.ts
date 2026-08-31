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
    OPENROUTER_API_KEY?: string;
    OPENROUTER_BASE_URL?: string;
    OPENROUTER_MODEL?: string;
    OPENROUTER_RPM?: string;
    ADVISORY_CONTEXT_WORD_LIMIT?: string;
    ADVISORY_KEEP_RECENT?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_NAME?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_FROM?: string;
    RESET_CODE_TTL_MINUTES?: string;
    JWT_RESET_SECRET?: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_REGION: string;
    AWS_S3_BUCKET_NAME: string;
    MQTT_BROKER: string;
    MQTT_PORT?: string;
    MQTT_TOPIC: string;
    MQTT_USERNAME: string;
    MQTT_PASSWORD: string;
    GEMINI_API_KEY: string;
    GROQ_API_KEY: string
  }
}