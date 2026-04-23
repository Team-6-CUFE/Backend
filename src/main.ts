import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import session from 'express-session';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createRedisSessionStore } from './redis/redis-session.store';
import { AppModule } from './app.module';
import { configureMeilisearch } from './search/configure';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const redisUrl = configService.get<string>('REDIS_URL')!;

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const redisAdapter = createAdapter(pubClient, subClient);

  class RedisIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: any) {
      const server = super.createIOServer(port, options);
      server.adapter(redisAdapter);
      return server;
    }
  }

  app.useWebSocketAdapter(new RedisIoAdapter(app));

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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { withCredentials: true },
  });

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
  try {
    await configureMeilisearch();
  } catch (err) {
    Logger.warn(
      `Meilisearch configuration failed (search may be unavailable): ${(err as Error).message}`,
      'Bootstrap'
    );
  }

  const PORT = process.env.PORT || 8080;
  await app.listen(PORT);
  // eslint-disable-next-line no-console
  console.log(`Server ready at http://localhost:${PORT}/api`);
}

bootstrap();
