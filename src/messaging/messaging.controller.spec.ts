import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { ChatFilter } from './enums/chat-filter.enum';
import {
  mockMessagingService,
  mockChat,
  mockMessage,
  mockUserOne,
  mockUserTwo,
  makeCreateChatDto,
  makeGetChatsDto,
  makeGetMessagesDto,
} from './test/messaging.mock';

describe('MessagingController', () => {
  let controller: MessagingController;
  let service: typeof mockMessagingService;

  const { userId } = mockUserOne;

  const chatResDto = {
    chatId: mockChat.chatId,
    otherUser: {
      userId: mockUserTwo.userId,
      username: mockUserTwo.username,
      displayName: mockUserTwo.displayName,
      avatarUrl: null,
    },
    isArchived: false,
    unreadCount: 0,
    lastMessage: null,
  };

  const paginationDto = { page: 1, limit: 20, total: 1, totalPages: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [{ provide: MessagingService, useValue: mockMessagingService }],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
    service = module.get(MessagingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createChat', () => {
    it('delegates to MessagingService.createChat and returns the result', async () => {
      const dto = makeCreateChatDto();
      const expected = { status: 'success', data: chatResDto };
      service.createChat.mockResolvedValue(expected);

      const result = await controller.createChat(userId, dto);

      expect(service.createChat).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(expected);
    });

    it('propagates errors thrown by the service', async () => {
      service.createChat.mockRejectedValue(new Error('block'));

      await expect(controller.createChat(userId, makeCreateChatDto())).rejects.toThrow('block');
    });
  });

  describe('getChats', () => {
    it('delegates with default page/limit and filter', async () => {
      const dto = makeGetChatsDto();
      const expected = { status: 'success', data: [chatResDto], pagination: paginationDto };
      service.getChats.mockResolvedValue(expected);

      const result = await controller.getChats(userId, dto);

      expect(service.getChats).toHaveBeenCalledWith(userId, 1, 20, ChatFilter.ALL);
      expect(result).toEqual(expected);
    });

    it('passes through a custom filter', async () => {
      const dto = makeGetChatsDto({ filter: ChatFilter.ARCHIVED, page: 2, limit: 10 });
      service.getChats.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: paginationDto,
      });

      await controller.getChats(userId, dto);

      expect(service.getChats).toHaveBeenCalledWith(userId, 2, 10, ChatFilter.ARCHIVED);
    });

    it('uses default page=1 and limit=20 when dto fields are undefined', async () => {
      const dto = { filter: ChatFilter.ALL } as any;
      service.getChats.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: paginationDto,
      });

      await controller.getChats(userId, dto);

      expect(service.getChats).toHaveBeenCalledWith(userId, 1, 20, ChatFilter.ALL);
    });
  });

  describe('getMessages', () => {
    const { chatId } = mockChat;

    it('delegates to MessagingService.getMessages and returns result', async () => {
      const dto = makeGetMessagesDto();
      const expected = {
        status: 'success',
        data: [{ messageId: mockMessage.messageId }],
        pagination: paginationDto,
      };
      service.getMessages.mockResolvedValue(expected);

      const result = await controller.getMessages(userId, chatId, dto);

      expect(service.getMessages).toHaveBeenCalledWith(userId, chatId, dto);
      expect(result).toEqual(expected);
    });

    it('propagates not-found errors', async () => {
      service.getMessages.mockRejectedValue(new Error('Chat not found'));

      await expect(controller.getMessages(userId, chatId, makeGetMessagesDto())).rejects.toThrow(
        'Chat not found'
      );
    });
  });

  describe('archiveChat', () => {
    const { chatId } = mockChat;

    it('delegates to MessagingService.archiveChat and returns result', async () => {
      const expected = { status: 'success', message: 'Chat archived' };
      service.archiveChat.mockResolvedValue(expected);

      const result = await controller.archiveChat(userId, chatId);

      expect(service.archiveChat).toHaveBeenCalledWith(userId, chatId);
      expect(result).toEqual(expected);
    });
  });

  describe('markUnread', () => {
    const { chatId } = mockChat;

    it('delegates to MessagingService.markUnread and returns result', async () => {
      const expected = { status: 'success', message: 'Chat marked as unread' };
      service.markUnread.mockResolvedValue(expected);

      const result = await controller.markUnread(userId, chatId);

      expect(service.markUnread).toHaveBeenCalledWith(userId, chatId);
      expect(result).toEqual(expected);
    });
  });

  describe('getUnreadCount', () => {
    it('delegates to MessagingService.getUnreadCount and returns the count', async () => {
      const expected = { status: 'success', data: { unreadCount: 5 } };
      service.getUnreadCount.mockResolvedValue(expected);

      const result = await controller.getUnreadCount(userId);

      expect(service.getUnreadCount).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expected);
    });

    it('returns zero when there are no unread messages', async () => {
      service.getUnreadCount.mockResolvedValue({ status: 'success', data: { unreadCount: 0 } });

      const result = await controller.getUnreadCount(userId);

      expect(result.data.unreadCount).toBe(0);
    });
  });
});
