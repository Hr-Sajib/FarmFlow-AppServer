// env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      BCRYPT_SALT_ROUNDS: string;
      DEFAULT_PASS: string;
      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;
      JWT_ACCESS_EXPIRES_IN: string;
      JWT_REFRESH_EXPIRES_IN: string;
      INFLUXDB_URL: string;
      INFLUXDB_TOKEN: string;
      INFLUXDB_ORG: string;
      INFLUXDB_BUCKET: string;
    }
  }