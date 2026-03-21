import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const client = createClient({
          url: configService.get<string>('REDIS_URL'),
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                console.error('Redis: max reconnection attempts reached');
                return new Error('Max retries reached');
              }
              return Math.min(retries * 100, 3000);
            },
          },
        });

        client.on('error', (err) => console.error('Redis error:', err));
        client.on('connect', () => console.log('Redis connected'));
        client.on('reconnecting', () => console.log('Redis reconnecting...'));
        client.on('ready', () => console.log('Redis ready'));

        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
