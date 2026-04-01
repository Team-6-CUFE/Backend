import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const values: Record<string, string | number> = {
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'secret',
      DB_DATABASE: 'harmonica',
      NODE_ENV: 'development',
    };
    return values[key];
  }),
} as unknown as ConfigService;

describe('getDatabaseConfig', () => {
  it('should return correct connection fields from ConfigService', () => {
    const config = getDatabaseConfig(mockConfigService);

    expect(config.type).toBe('postgres');
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.username).toBe('postgres');
    expect(config.password).toBe('secret');
    expect(config.database).toBe('harmonica');
  });

  it('should set synchronize to false', () => {
    const config = getDatabaseConfig(mockConfigService);

    expect(config.synchronize).toBe(false);
  });

  it('should set migrationsRun to false', () => {
    const config = getDatabaseConfig(mockConfigService);

    expect(config.migrationsRun).toBe(false);
  });

  it('should enable logging in development', () => {
    const config = getDatabaseConfig(mockConfigService);

    expect(config.logging).toBe(true);
  });

  it('should disable logging in production', () => {
    const prodConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return 'value';
      }),
    } as unknown as ConfigService;

    const config = getDatabaseConfig(prodConfigService);

    expect(config.logging).toBe(false);
  });

  it('should include entities and migrations path patterns', () => {
    const config = getDatabaseConfig(mockConfigService);

    expect(Array.isArray(config.entities)).toBe(true);
    expect(Array.isArray(config.migrations)).toBe(true);
    expect((config.entities as string[])[0]).toContain('.entity');
    expect((config.migrations as string[])[0]).toContain('migrations');
  });
});
