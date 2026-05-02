// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  synchronize: false, // NEVER true in production
  logging: configService.get<string>('NODE_ENV') === 'development',
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
  migrationsRun: false, // Run migrations manually

  ssl:{
    rejectUnauthorized: false,
  },
});
