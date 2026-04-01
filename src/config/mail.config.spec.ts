import { ConfigService } from '@nestjs/config';
import { getMailConfig } from './mail.config';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const values: Record<string, string | number> = {
      MAIL_HOST: 'smtp.example.com',
      MAIL_PORT: 587,
      MAIL_SECURE: 'false',
      MAIL_USER: 'user@example.com',
      MAIL_PASSWORD: 'mailsecret',
      MAIL_FROM_NAME: 'Harmonica',
      MAIL_FROM_EMAIL: 'no-reply@harmonica.com',
    };
    return values[key];
  }),
} as unknown as ConfigService;

describe('getMailConfig', () => {
  it('should configure the SMTP transport correctly', () => {
    const config = getMailConfig(mockConfigService);
    const transport = config.transport as {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
    };

    expect(transport.host).toBe('smtp.example.com');
    expect(transport.port).toBe(587);
    expect(transport.secure).toBe(false);
    expect(transport.auth.user).toBe('user@example.com');
    expect(transport.auth.pass).toBe('mailsecret');
  });

  it('should set secure to true when MAIL_SECURE is "true"', () => {
    const secureConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'MAIL_SECURE') return 'true';
        return 'value';
      }),
    } as unknown as ConfigService;

    const config = getMailConfig(secureConfigService);
    const transport = config.transport as { secure: boolean };

    expect(transport.secure).toBe(true);
  });

  it('should set the from address using name and email from config', () => {
    const config = getMailConfig(mockConfigService);

    expect(config.defaults?.from).toBe('"Harmonica" <no-reply@harmonica.com>');
  });

  it('should configure handlebars template adapter', () => {
    const config = getMailConfig(mockConfigService);

    expect(config.template?.adapter).toBeDefined();
    expect(config.template?.dir).toContain('templates');
    expect(config.template?.options).toEqual({ strict: true });
  });
});
