import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class WebsocketsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit() {
    this.logger.log('Websocket gateway initialized');
  }

  private extractToken(client: Socket): string | null {
    // desktop/mobile clients
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    // web clients
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) return match[1];
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // attach user to socket
      Object.assign(client.data, { user: payload });

      // each user gets their own room
      await client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected: ${client.id} (user: ${client.data.user?.sub ?? 'unknown'})`
    );
  }
}
