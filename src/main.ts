import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import session from 'express-session';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { createRedisSessionStore } from './redis/redis-session.store';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());

  const sessionStore = await createRedisSessionStore(configService.get<string>('REDIS_URL')!);

  app.use(
    session({
      store: sessionStore,
      secret: configService.get<string>('SESSION_SECRET')!,
      resave: false,
      saveUninitialized: false,
      name: 'sc.sid',
      cookie: {
        httpOnly: true,
        secure: configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000, // 5 minutes
      },
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Harmonica Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors();

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const PORT = process.env.PORT || 8080;
  await app.listen(PORT);
  console.log(`Server ready at http://localhost:${PORT}/api`);
}

bootstrap();
