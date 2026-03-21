import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

export async function createRedisSessionStore(redisUrl: string) {
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Session Redis error:', err));
  await client.connect();

  return new RedisStore({
    client,
    prefix: 'session:',
    ttl: 300,
  });
}
