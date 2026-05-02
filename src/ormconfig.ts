// src/ormconfig.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { config } from 'dotenv';
config();

const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';
const base = isProd ? 'dist' : 'src';

const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [`${base}/**/*.entity.${ext}`],
  migrations: [`${base}/database/migrations/*.${ext}`],
  synchronize: false,
  logging: !isProd,
  seeds: [`${base}/database/seeds/**/*.${ext}`],
  factories: [`${base}/database/factories/**/*.${ext}`],
  ssl: {
    rejectUnauthorized: false,
  },
};

export default new DataSource(options);
