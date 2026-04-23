import { Injectable, Logger } from '@nestjs/common';
import { WebsocketsGateway } from './websockets.gateway';

@Injectable()
export class WebsocketsService {
  private readonly logger = new Logger(WebsocketsService.name);

  constructor(private readonly gateway: WebsocketsGateway) {}

  // emit an event to all active connections of a specific user
  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.gateway.server.to(`user:${userId}`).emit(event, payload);
    this.logger.debug(`Emitted '${event}' to user:${userId}`);
  }

  // emit to everyone in a chat room
  emitToRoom<T>(room: string, event: string, payload: T): void {
    this.gateway.server.to(room).emit(event, payload);
  }

  // lets a socket join a named room
  async joinRoom(socketId: string, room: string): Promise<void> {
    const socket = this.gateway.server.sockets.sockets.get(socketId);
    if (socket) {
      await socket.join(room);
      this.logger.debug(`Socket ${socketId} joined room ${room}`);
    }
  }

  async leaveRoom(socketId: string, room: string): Promise<void> {
    const socket = this.gateway.server.sockets.sockets.get(socketId);
    if (socket) {
      await socket.leave(room);
    }
  }
}
