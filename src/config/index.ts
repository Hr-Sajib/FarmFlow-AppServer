import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '5002', 10),
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  default_password: process.env.DEFAULT_PASS || undefined,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,

  gemini_api_key : process.env.GEMINI_API_KEY,
  groq_api_key : process.env.GROQ_API_KEY,

  openrouter: {
    api_key: process.env.OPENROUTER_API_KEY,
    base_url: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m3:free',
    // The free tier allows 20 requests/minute; stay just under it.
    max_requests_per_minute: parseInt(process.env.OPENROUTER_RPM || '18', 10),
    // Total words of transcript tolerated before older turns are compressed.
    context_word_limit: parseInt(process.env.ADVISORY_CONTEXT_WORD_LIMIT || '2000', 10),
    // How many recent messages stay verbatim after a compression pass.
    keep_recent_messages: parseInt(process.env.ADVISORY_KEEP_RECENT || '6', 10),
  },

  api_origin: process.env.API_ORIGIN || `http://localhost:${process.env.PORT || 5002}`,

  client_origin: process.env.CLIENT_ORIGIN || 'http://localhost:3002',

  admin_email: process.env.ADMIN_EMAIL,
  admin_password: process.env.ADMIN_PASSWORD,
  admin_name: process.env.ADMIN_NAME || 'FarmFlow Admin',

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'FarmFlow <no-reply@farmflow.app>',
  },

  reset_code_ttl_minutes: parseInt(process.env.RESET_CODE_TTL_MINUTES || '10', 10),
  jwt_reset_secret: process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET,

  aws: {
    aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
    aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    aws_region: process.env.AWS_REGION,
    aws_s3_bucket_name: process.env.AWS_S3_BUCKET_NAME,
  },

  mqtt_broker: process.env.MQTT_BROKER,
  mqtt_port: parseInt(process.env.MQTT_PORT || '8883', 10),
  mqtt_topic: process.env.MQTT_TOPIC,
  mqtt_username: process.env.MQTT_USERNAME,
  mqtt_password: process.env.MQTT_PASSWORD,

};