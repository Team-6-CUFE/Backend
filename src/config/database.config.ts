// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE'),
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  synchronize: false, // NEVER true in production
  logging: configService.get<string>('NODE_ENV') === 'development',
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
  migrationsRun: false, // Run migrations manually
});
