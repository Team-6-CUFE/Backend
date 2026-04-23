import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebsocketsService } from '../websockets/websockets.service';
import { MessagingService } from './messaging.service';
import { WsExceptionFilter } from '../websockets/filters/ws-exception.filter';
import { JoinChatDto } from './dto/ws/join-chat.dto';
import { SendMessageDto } from './dto/ws/send-message.dto';
import { MarkReadDto } from './dto/ws/mark-read.dto';
import { TypingDto } from './dto/ws/typing.dto';
import { MessageResDto } from './dto/message-res.dto';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class MessagingGateway {
  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly messagingService: MessagingService
  ) {}

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinChatDto
  ): Promise<{ event: string; data: { chatId: string } }> {
    const userId = client.data.user?.sub;
    if (!userId) throw new WsException('Unauthorized');

    const isParticipant = await this.messagingService.isParticipant(dto.chatId, userId);
    if (!isParticipant) throw new WsException('Forbidden');

    await this.websocketsService.joinRoom(client.id, `chat:${dto.chatId}`);
    return { event: 'chat:joined', data: { chatId: dto.chatId } };
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinChatDto
  ): Promise<{ event: string; data: { chatId: string } }> {
    await this.websocketsService.leaveRoom(client.id, `chat:${dto.chatId}`);
    return { event: 'chat:left', data: { chatId: dto.chatId } };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto
  ): Promise<{ event: string; data: MessageResDto }> {
    const userId = client.data.user?.sub;
    if (!userId) throw new WsException('Unauthorized');

    try {
      // Service handles persistence, block check, and emitting to the room
      const result = await this.messagingService.sendMessage(userId, dto);
      return { event: 'message:sent', data: result.data };
    } catch (err: any) {
      throw new WsException(err.message ?? 'Failed to send message');
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkReadDto
  ): Promise<{ event: string; data: { chatId: string } }> {
    const userId = client.data.user?.sub;
    if (!userId) throw new WsException('Unauthorized');

    try {
      await this.messagingService.markRead(userId, dto);

      // Notify the other participant their message was read
      const otherUserId = await this.messagingService.getOtherParticipantId(dto.chatId, userId);

      this.websocketsService.emitToUser(otherUserId, 'message:read', {
        chatId: dto.chatId,
        lastReadMessageId: dto.lastReadMessageId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });

      return { event: 'message:read:ack', data: { chatId: dto.chatId } };
    } catch (err: any) {
      throw new WsException(err.message ?? 'Failed to mark as read');
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(@ConnectedSocket() client: Socket, @MessageBody() dto: TypingDto) {
    const userId = client.data.user?.sub;
    if (!userId) throw new WsException('Unauthorized');

    // Prevent non-participants from spoofing typing indicators
    const isParticipant = await this.messagingService.isParticipant(dto.chatId, userId);
    if (!isParticipant) throw new WsException('Forbidden');

    // Broadcast to room but exclude the sender
    client.to(`chat:${dto.chatId}`).emit('message:typing', {
      chatId: dto.chatId,
      userId,
      isTyping: dto.isTyping,
    });
  }
}
