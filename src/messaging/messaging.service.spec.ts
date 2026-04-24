import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingRepository } from './messaging.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { MessageType } from './enums/message-type.enum';
import { ChatFilter } from './enums/chat-filter.enum';
import {
  mockMessagingRepository,
  mockWebsocketsService,
  mockChat,
  mockMessage,
  mockChatStatus,
  mockUserOne,
  mockUserTwo,
  makeCreateChatDto,
  makeSendMessageDto,
  makeMarkReadDto,
  makeGetMessagesDto,
} from './test/messaging.mock';

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: MessagingRepository, useValue: mockMessagingRepository },
        { provide: WebsocketsService, useValue: mockWebsocketsService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    it('throws BadRequestException when user tries to chat with themselves', async () => {
      await expect(
        service.createChat(mockUserOne.userId, makeCreateChatDto(mockUserOne.userId))
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when a block relationship exists', async () => {
      mockMessagingRepository.hasBlockRelationship.mockResolvedValue(true);

      await expect(service.createChat(mockUserOne.userId, makeCreateChatDto())).rejects.toThrow(
        ForbiddenException
      );
    });

    it('returns existing chat idempotently without emitting', async () => {
      mockMessagingRepository.hasBlockRelationship.mockResolvedValue(false);
      mockMessagingRepository.findChatByParticipants.mockResolvedValue(mockChat);
      mockMessagingRepository.getChatStatus.mockResolvedValue(mockChatStatus);
      mockMessagingRepository.getUnreadCount.mockResolvedValue(0);

      const result = await service.createChat(mockUserOne.userId, makeCreateChatDto());

      expect(result.status).toBe('success');
      expect(mockMessagingRepository.createChat).not.toHaveBeenCalled();
      expect(mockWebsocketsService.emitToUser).not.toHaveBeenCalled();
    });

    it('creates a new chat, emits chat:new to the other user, and returns formatted chat', async () => {
      mockMessagingRepository.hasBlockRelationship.mockResolvedValue(false);
      mockMessagingRepository.findChatByParticipants.mockResolvedValue(null);
      mockMessagingRepository.createChat.mockResolvedValue(mockChat);
      mockMessagingRepository.findChatByIdWithParticipants.mockResolvedValue(mockChat);
      mockMessagingRepository.getChatStatus.mockResolvedValue(mockChatStatus);
      mockMessagingRepository.getUnreadCount.mockResolvedValue(0);

      const result = await service.createChat(mockUserOne.userId, makeCreateChatDto());

      expect(result.status).toBe('success');
      expect(mockMessagingRepository.createChat).toHaveBeenCalledWith(
        mockUserOne.userId,
        mockUserTwo.userId
      );
      expect(mockWebsocketsService.emitToUser).toHaveBeenCalledWith(
        mockUserTwo.userId,
        'chat:new',
        expect.any(Object)
      );
    });
  });

  describe('getChats', () => {
    it('returns paginated chats with status success', async () => {
      mockMessagingRepository.getChats.mockResolvedValue({ chats: [mockChat], total: 1 });
      mockMessagingRepository.getChatStatus.mockResolvedValue(mockChatStatus);
      mockMessagingRepository.getUnreadCount.mockResolvedValue(0);

      const result = await service.getChats(mockUserOne.userId, 1, 20, ChatFilter.ALL);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });

    it('passes filter param to repository', async () => {
      mockMessagingRepository.getChats.mockResolvedValue({ chats: [], total: 0 });

      await service.getChats(mockUserOne.userId, 1, 20, ChatFilter.UNREAD);

      expect(mockMessagingRepository.getChats).toHaveBeenCalledWith(
        mockUserOne.userId,
        1,
        20,
        ChatFilter.UNREAD
      );
    });
  });

  describe('getMessages', () => {
    it('throws ForbiddenException when user is not a participant', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(false);

      await expect(
        service.getMessages('not-a-participant', mockChat.chatId, makeGetMessagesDto())
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns paginated messages', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.getMessages.mockResolvedValue({
        messages: [mockMessage],
        total: 1,
      });

      const result = await service.getMessages(
        mockUserOne.userId,
        mockChat.chatId,
        makeGetMessagesDto()
      );

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.hasBlockRelationship.mockResolvedValue(false);
      mockMessagingRepository.createMessage.mockResolvedValue(mockMessage);
      mockMessagingRepository.setChatArchived.mockResolvedValue(undefined);
    });

    it('throws ForbiddenException when sender is not a participant', async () => {
      mockMessagingRepository.isParticipant.mockResolvedValue(false);

      await expect(service.sendMessage(mockUserOne.userId, makeSendMessageDto())).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws ForbiddenException when block relationship exists', async () => {
      mockMessagingRepository.hasBlockRelationship.mockResolvedValue(true);

      await expect(service.sendMessage(mockUserOne.userId, makeSendMessageDto())).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws BadRequestException when text message has no content', async () => {
      await expect(
        service.sendMessage(mockUserOne.userId, makeSendMessageDto({ content: '   ' }))
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when track_share has no sharedTrackId', async () => {
      await expect(
        service.sendMessage(
          mockUserOne.userId,
          makeSendMessageDto({ messageType: MessageType.TRACK_SHARE, content: 'listen!' })
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when playlist_share has no sharedPlaylistId', async () => {
      await expect(
        service.sendMessage(
          mockUserOne.userId,
          makeSendMessageDto({ messageType: MessageType.PLAYLIST_SHARE, content: 'listen!' })
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('persists message, auto-unarchives both sides, emits to room', async () => {
      const result = await service.sendMessage(mockUserOne.userId, makeSendMessageDto());

      expect(mockMessagingRepository.createMessage).toHaveBeenCalled();
      expect(mockMessagingRepository.setChatArchived).toHaveBeenCalledTimes(2);
      expect(mockMessagingRepository.setChatArchived).toHaveBeenCalledWith(
        mockChat.chatId,
        mockUserOne.userId,
        false
      );
      expect(mockMessagingRepository.setChatArchived).toHaveBeenCalledWith(
        mockChat.chatId,
        mockUserTwo.userId,
        false
      );
      expect(mockWebsocketsService.emitToRoom).toHaveBeenCalledWith(
        `chat:${mockChat.chatId}`,
        'message:new',
        expect.any(Object)
      );
      expect(result.status).toBe('success');
    });

    it('sends track share message with valid sharedTrackId', async () => {
      const trackId = 'tttttttt-0000-0000-0000-000000000099';
      const dto = makeSendMessageDto({
        messageType: MessageType.TRACK_SHARE,
        sharedTrackId: trackId,
      });
      mockMessagingRepository.createMessage.mockResolvedValue({
        ...mockMessage,
        messageType: MessageType.TRACK_SHARE,
        sharedTrackId: trackId,
      });

      const result = await service.sendMessage(mockUserOne.userId, dto);
      expect(result.status).toBe('success');
    });
  });

  describe('markRead', () => {
    it('throws NotFoundException when message does not exist', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.findMessage.mockResolvedValue(null);

      await expect(service.markRead(mockUserOne.userId, makeMarkReadDto())).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws NotFoundException when message belongs to a different chat', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.findMessage.mockResolvedValue({
        ...mockMessage,
        chatId: 'different-chat-id',
      });

      await expect(service.markRead(mockUserOne.userId, makeMarkReadDto())).rejects.toThrow(
        NotFoundException
      );
    });

    it('marks message as read and returns success', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.findMessage.mockResolvedValue(mockMessage);
      mockMessagingRepository.markRead.mockResolvedValue(undefined);

      const result = await service.markRead(mockUserOne.userId, makeMarkReadDto());
      expect(result.status).toBe('success');
      expect(mockMessagingRepository.markRead).toHaveBeenCalledWith(
        mockChat.chatId,
        mockUserOne.userId,
        mockMessage.messageId
      );
    });
  });

  describe('markUnread', () => {
    it('throws ForbiddenException when user is not a participant', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(false);

      await expect(service.markUnread('not-a-participant', mockChat.chatId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('marks chat as unread and returns success', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.markUnread.mockResolvedValue(undefined);

      const result = await service.markUnread(mockUserOne.userId, mockChat.chatId);
      expect(result.status).toBe('success');
      expect(mockMessagingRepository.markUnread).toHaveBeenCalledWith(
        mockChat.chatId,
        mockUserOne.userId
      );
    });
  });

  describe('archiveChat', () => {
    it('throws NotFoundException when chat does not exist', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(null);

      await expect(service.archiveChat(mockUserOne.userId, mockChat.chatId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('archives chat and returns success', async () => {
      mockMessagingRepository.findChatById.mockResolvedValue(mockChat);
      mockMessagingRepository.isParticipant.mockResolvedValue(true);
      mockMessagingRepository.setChatArchived.mockResolvedValue(undefined);

      const result = await service.archiveChat(mockUserOne.userId, mockChat.chatId);
      expect(result.status).toBe('success');
      expect(mockMessagingRepository.setChatArchived).toHaveBeenCalledWith(
        mockChat.chatId,
        mockUserOne.userId,
        true
      );
    });
  });

  describe('getUnreadCount', () => {
    it('returns total unread count for user', async () => {
      mockMessagingRepository.getTotalUnreadCount.mockResolvedValue(7);

      const result = await service.getUnreadCount(mockUserOne.userId);
      expect(result.status).toBe('success');
      expect(result.data.unreadCount).toBe(7);
    });

    it('returns 0 when no unread messages', async () => {
      mockMessagingRepository.getTotalUnreadCount.mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserOne.userId);
      expect(result.data.unreadCount).toBe(0);
    });
  });
});
