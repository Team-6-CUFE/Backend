import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketsService } from './websockets.service';
import { WebsocketsGateway } from './websockets.gateway';

const makeServer = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  sockets: {
    sockets: new Map<string, any>(),
  },
});

const makeGateway = (server: ReturnType<typeof makeServer>) =>
  ({ server }) as unknown as WebsocketsGateway;

describe('WebsocketsService', () => {
  let service: WebsocketsService;
  let server: ReturnType<typeof makeServer>;

  beforeEach(async () => {
    server = makeServer();
    const gateway = makeGateway(server);

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebsocketsService, { provide: WebsocketsGateway, useValue: gateway }],
    }).compile();

    service = module.get<WebsocketsService>(WebsocketsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('emitToUser', () => {
    it('targets the user room and emits the event with payload', () => {
      service.emitToUser('user-123', 'chat:new', { chatId: 'abc' });

      expect(server.to).toHaveBeenCalledWith('user:user-123');
      expect(server.emit).toHaveBeenCalledWith('chat:new', { chatId: 'abc' });
    });

    it('chains to() → emit() correctly', () => {
      // to() returns `this` (the server mock), so emit is called on the same object
      service.emitToUser('u1', 'ping', null);
      expect(server.to).toHaveBeenCalledTimes(1);
      expect(server.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitToRoom', () => {
    it('targets the given room and emits the event with payload', () => {
      service.emitToRoom('chat:room-1', 'message:new', { messageId: 'm1' });

      expect(server.to).toHaveBeenCalledWith('chat:room-1');
      expect(server.emit).toHaveBeenCalledWith('message:new', { messageId: 'm1' });
    });
  });

  describe('joinRoom', () => {
    it('calls socket.join when the socket exists', async () => {
      const mockSocket = { join: jest.fn(), leave: jest.fn() };
      server.sockets.sockets.set('socket-1', mockSocket);

      await service.joinRoom('socket-1', 'chat:room-1');

      expect(mockSocket.join).toHaveBeenCalledWith('chat:room-1');
    });

    it('does nothing when socket is not found', async () => {
      // Should not throw even if socketId is unknown
      await expect(service.joinRoom('unknown-socket', 'chat:room-1')).resolves.toBeUndefined();
    });
  });

  describe('leaveRoom', () => {
    it('calls socket.leave when the socket exists', async () => {
      const mockSocket = { join: jest.fn(), leave: jest.fn() };
      server.sockets.sockets.set('socket-2', mockSocket);

      await service.leaveRoom('socket-2', 'chat:room-99');

      expect(mockSocket.leave).toHaveBeenCalledWith('chat:room-99');
    });

    it('does nothing when socket is not found', async () => {
      await expect(service.leaveRoom('ghost', 'chat:room-1')).resolves.toBeUndefined();
    });
  });
});
