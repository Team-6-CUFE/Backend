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

  url: process.env.DATABASE_URL, 

  entities: [`${base}/**/*.entity.${ext}`],
  migrations: [`${base}/database/migrations/*.${ext}`],
  synchronize: false,
  logging: !isProd,

  seeds: [`${base}/database/seeds/**/*.${ext}`],
  factories: [`${base}/database/factories/**/*.${ext}`],

  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
};

export default new DataSource(options);
