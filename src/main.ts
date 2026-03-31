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
      secret: process.env.SESSION_SECRET || 'fallback_secret_for_dev_only',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
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
    .addServer('/api')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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
  // eslint-disable-next-line no-console
  console.log(`Server ready at http://localhost:${PORT}/api`);
}

bootstrap();
