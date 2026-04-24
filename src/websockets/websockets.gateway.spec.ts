import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';

const makeSocket = (overrides: Record<string, any> = {}) => ({
  id: 'socket-test',
  data: {} as Record<string, any>,
  handshake: {
    auth: {},
    headers: { cookie: '' },
  },
  emit: jest.fn(),
  join: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

describe('WebsocketsGateway', () => {
  let gateway: WebsocketsGateway;
  let jwtService: jest.Mocked<JwtService>;

  const JWT_SECRET = 'test-secret';
  const validPayload = { sub: 'user-123', username: 'testuser' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketsGateway,
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(JWT_SECRET) },
        },
      ],
    }).compile();

    gateway = module.get<WebsocketsGateway>(WebsocketsGateway);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('afterInit', () => {
    it('runs without throwing', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('attaches user payload to socket.data and joins user room when token is valid (auth header)', async () => {
      const client = makeSocket({
        handshake: { auth: { token: 'valid-token' }, headers: { cookie: '' } },
      });
      jwtService.verify.mockReturnValue(validPayload as any);

      await gateway.handleConnection(client as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: JWT_SECRET });
      expect(client.data.user).toEqual(validPayload);
      expect(client.join).toHaveBeenCalledWith(`user:${validPayload.sub}`);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('extracts token from cookie header when auth token is absent', async () => {
      const cookieHeader = 'session=abc; access_token=cookie-token; other=xyz';
      const client = makeSocket({ handshake: { auth: {}, headers: { cookie: cookieHeader } } });
      jwtService.verify.mockReturnValue(validPayload as any);

      await gateway.handleConnection(client as any);

      expect(jwtService.verify).toHaveBeenCalledWith('cookie-token', { secret: JWT_SECRET });
      expect(client.data.user).toEqual(validPayload);
    });

    it('prefers auth.token over cookie when both are present', async () => {
      const client = makeSocket({
        handshake: {
          auth: { token: 'auth-token' },
          headers: { cookie: 'access_token=cookie-token' },
        },
      });
      jwtService.verify.mockReturnValue(validPayload as any);

      await gateway.handleConnection(client as any);

      expect(jwtService.verify).toHaveBeenCalledWith('auth-token', { secret: JWT_SECRET });
    });

    it('emits error and disconnects when no token is provided', async () => {
      const client = makeSocket();

      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('emits error and disconnects when JWT verification fails', async () => {
      const client = makeSocket({
        handshake: { auth: { token: 'bad-token' }, headers: { cookie: '' } },
      });
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.data.user).toBeUndefined();
    });

    it('does not join user room on auth failure', async () => {
      const client = makeSocket();

      await gateway.handleConnection(client as any);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('runs without throwing for an authenticated socket', () => {
      const client = makeSocket({ data: { user: { sub: 'user-123' } } });
      expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
    });

    it('runs without throwing for an unauthenticated socket', () => {
      const client = makeSocket({ data: {} });
      expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
    });
  });
});
