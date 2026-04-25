import { ChatFilter } from '../enums/chat-filter.enum';
import { MessageType } from '../enums/message-type.enum';

export const mockUserOne = {
  userId: 'aaaaaaaa-0000-0000-0000-000000000001',
  username: 'user_one',
  displayName: 'User One',
  avatarUrl: 'https://s3.example.com/avatars/one.jpg',
};

export const mockUserTwo = {
  userId: 'bbbbbbbb-0000-0000-0000-000000000002',
  username: 'user_two',
  displayName: 'User Two',
  avatarUrl: null,
};

export const mockChat = {
  chatId: 'cccccccc-0000-0000-0000-000000000003',
  participantOneId: mockUserOne.userId,
  participantTwoId: mockUserTwo.userId,
  participantOne: mockUserOne,
  participantTwo: mockUserTwo,
  lastMessage: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const mockMessage = {
  messageId: 'dddddddd-0000-0000-0000-000000000004',
  chatId: mockChat.chatId,
  senderId: mockUserOne.userId,
  messageType: MessageType.TEXT,
  content: 'hello',
  sharedTrackId: null,
  sharedPlaylistId: null,
  createdAt: new Date('2025-01-01T00:01:00Z'),
  updatedAt: new Date('2025-01-01T00:01:00Z'),
};

export const mockChatStatus = {
  id: 'eeeeeeee-0000-0000-0000-000000000005',
  chatId: mockChat.chatId,
  userId: mockUserOne.userId,
  isArchived: false,
  lastReadMessageId: null,
  lastReadAt: null,
};

export const mockMessagingRepository = {
  findChatById: jest.fn(),
  findChatByIdWithParticipants: jest.fn(),
  findChatByParticipants: jest.fn(),
  createChat: jest.fn(),
  getChats: jest.fn(),
  isParticipant: jest.fn(),
  setChatArchived: jest.fn(),
  getMessages: jest.fn(),
  createMessage: jest.fn(),
  findMessage: jest.fn(),
  getChatStatus: jest.fn(),
  markRead: jest.fn(),
  markUnread: jest.fn(),
  getUnreadCount: jest.fn(),
  getTotalUnreadCount: jest.fn(),
  hasBlockRelationship: jest.fn(),
};

export const mockWebsocketsService = {
  emitToUser: jest.fn(),
  emitToRoom: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
};

export const mockMessagingService = {
  createChat: jest.fn(),
  getChats: jest.fn(),
  getMessages: jest.fn(),
  archiveChat: jest.fn(),
  markUnread: jest.fn(),
  markRead: jest.fn(),
  sendMessage: jest.fn(),
  getUnreadCount: jest.fn(),
  isParticipant: jest.fn(),
  getOtherParticipantId: jest.fn(),
};

export function makeMockSocket(userId: string, socketId = 'socket-abc'): any {
  return {
    id: socketId,
    data: { user: { sub: userId } },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    handshake: {
      auth: {},
      headers: { cookie: '' },
    },
  };
}

export const makeCreateChatDto = (participantTwoId = mockUserTwo.userId) => ({
  participantTwoId,
});

export const makeSendMessageDto = (overrides = {}) => ({
  chatId: mockChat.chatId,
  messageType: MessageType.TEXT,
  content: 'hello',
  ...overrides,
});

export const makeMarkReadDto = (overrides = {}) => ({
  chatId: mockChat.chatId,
  lastReadMessageId: mockMessage.messageId,
  ...overrides,
});

export const makeTypingDto = (isTyping = true) => ({
  chatId: mockChat.chatId,
  isTyping,
});

export const makeGetChatsDto = (overrides = {}) => ({
  page: 1,
  limit: 20,
  filter: ChatFilter.ALL,
  ...overrides,
});

export const makeGetMessagesDto = (overrides = {}) => ({
  page: 1,
  limit: 20,
  ...overrides,
});
