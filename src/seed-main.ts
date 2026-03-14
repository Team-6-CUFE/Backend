import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { runSeeder } from 'typeorm-extension';
import { AppModule } from './app.module';
import { UserSeeder } from './database/seeds/user.seeder';

async function bootstrap() {
  // Create an application context (no web server started)
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the DataSource provided by @nestjs/typeorm
    const dataSource = app.get(DataSource);

    console.log('Starting database seeding...');
    await runSeeder(dataSource, UserSeeder);
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:');
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();
