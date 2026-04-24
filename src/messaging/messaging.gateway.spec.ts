import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { WebsocketsService } from '../websockets/websockets.service';
import {
  mockMessagingService,
  mockWebsocketsService,
  mockChat,
  mockMessage,
  mockUserOne,
  mockUserTwo,
  makeMockSocket,
  makeSendMessageDto,
  makeMarkReadDto,
  makeTypingDto,
} from './test/messaging.mock';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: WebsocketsService, useValue: mockWebsocketsService },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
    jest.clearAllMocks();
  });

  describe('handleJoinChat', () => {
    it('throws WsException when socket has no user attached', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      client.data.user = undefined;

      await expect(gateway.handleJoinChat(client, { chatId: mockChat.chatId })).rejects.toThrow(
        WsException
      );
    });

    it('throws WsException when user is not a participant', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.isParticipant.mockResolvedValue(false);

      await expect(gateway.handleJoinChat(client, { chatId: mockChat.chatId })).rejects.toThrow(
        WsException
      );
    });

    it('joins room and returns chat:joined ack', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.isParticipant.mockResolvedValue(true);
      mockWebsocketsService.joinRoom.mockResolvedValue(undefined);

      const result = await gateway.handleJoinChat(client, { chatId: mockChat.chatId });

      expect(mockWebsocketsService.joinRoom).toHaveBeenCalledWith(
        client.id,
        `chat:${mockChat.chatId}`
      );
      expect(result).toEqual({
        event: 'chat:joined',
        data: { chatId: mockChat.chatId },
      });
    });
  });

  describe('handleLeaveChat', () => {
    it('leaves room and returns chat:left ack', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockWebsocketsService.leaveRoom.mockResolvedValue(undefined);

      const result = await gateway.handleLeaveChat(client, { chatId: mockChat.chatId });

      expect(mockWebsocketsService.leaveRoom).toHaveBeenCalledWith(
        client.id,
        `chat:${mockChat.chatId}`
      );
      expect(result).toEqual({
        event: 'chat:left',
        data: { chatId: mockChat.chatId },
      });
    });
  });

  describe('handleSendMessage', () => {
    it('throws WsException when socket has no user attached', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      client.data.user = undefined;

      await expect(gateway.handleSendMessage(client, makeSendMessageDto())).rejects.toThrow(
        WsException
      );
    });

    it('throws WsException when service throws (e.g. blocked)', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.sendMessage.mockRejectedValue(
        new Error('Cannot send message due to a block relationship')
      );

      await expect(gateway.handleSendMessage(client, makeSendMessageDto())).rejects.toThrow(
        WsException
      );
    });

    it('calls sendMessage and returns message:sent ack', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.sendMessage.mockResolvedValue({
        status: 'success',
        data: mockMessage,
      });

      const result = await gateway.handleSendMessage(client, makeSendMessageDto());

      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        mockUserOne.userId,
        expect.objectContaining({ chatId: mockChat.chatId })
      );
      expect(result).toEqual({
        event: 'message:sent',
        data: mockMessage,
      });
    });
  });

  describe('handleMarkRead', () => {
    it('throws WsException when socket has no user attached', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      client.data.user = undefined;

      await expect(gateway.handleMarkRead(client, makeMarkReadDto())).rejects.toThrow(WsException);
    });

    it('marks read, emits message:read to other user, returns ack', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.markRead.mockResolvedValue({ status: 'success' });
      mockMessagingService.getOtherParticipantId.mockResolvedValue(mockUserTwo.userId);

      const result = await gateway.handleMarkRead(client, makeMarkReadDto());

      expect(mockMessagingService.markRead).toHaveBeenCalledWith(
        mockUserOne.userId,
        expect.objectContaining({ chatId: mockChat.chatId })
      );
      expect(mockWebsocketsService.emitToUser).toHaveBeenCalledWith(
        mockUserTwo.userId,
        'message:read',
        expect.objectContaining({
          chatId: mockChat.chatId,
          lastReadMessageId: mockMessage.messageId,
          readBy: mockUserOne.userId,
        })
      );
      expect(result).toEqual({
        event: 'message:read:ack',
        data: { chatId: mockChat.chatId },
      });
    });

    it('throws WsException when service throws', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.markRead.mockRejectedValue(new Error('Message not found in this chat'));

      await expect(gateway.handleMarkRead(client, makeMarkReadDto())).rejects.toThrow(WsException);
    });
  });

  describe('handleTyping', () => {
    it('throws WsException when socket has no user attached', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      client.data.user = undefined;

      await expect(gateway.handleTyping(client, makeTypingDto())).rejects.toThrow(WsException);
    });

    it('throws WsException when user is not a participant', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.isParticipant.mockResolvedValue(false);

      await expect(gateway.handleTyping(client, makeTypingDto())).rejects.toThrow(WsException);
    });

    it('broadcasts typing indicator to room excluding sender', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.isParticipant.mockResolvedValue(true);

      await gateway.handleTyping(client, makeTypingDto(true));

      expect(client.to).toHaveBeenCalledWith(`chat:${mockChat.chatId}`);
      expect(client.emit).toHaveBeenCalledWith(
        'message:typing',
        expect.objectContaining({
          chatId: mockChat.chatId,
          userId: mockUserOne.userId,
          isTyping: true,
        })
      );
    });

    it('broadcasts isTyping false when user stops typing', async () => {
      const client = makeMockSocket(mockUserOne.userId);
      mockMessagingService.isParticipant.mockResolvedValue(true);

      await gateway.handleTyping(client, makeTypingDto(false));

      expect(client.emit).toHaveBeenCalledWith(
        'message:typing',
        expect.objectContaining({ isTyping: false })
      );
    });
  });
});
