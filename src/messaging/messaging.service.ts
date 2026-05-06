import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MessagingRepository } from './messaging.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateChatDto } from './dto/api/create-chat.dto';
import { SendMessageDto, MessageType } from './dto/ws/send-message.dto';
import { MarkReadDto } from './dto/ws/mark-read.dto';
import { GetMessagesReqDto } from './dto/api/get-messages-req.dto';
import { ChatResDto } from './dto/chat-res.dto';
import { MessageResDto } from './dto/message-res.dto';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { ChatFilter } from './enums/chat-filter.enum';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class MessagingService {
  constructor(
    private readonly messagingRepository: MessagingRepository,
    private readonly websocketsService: WebsocketsService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly userRepository: UserRepository
  ) {}

  async createChat(currentUserId: string, dto: CreateChatDto) {
    if (currentUserId === dto.participantTwoId) {
      throw new BadRequestException('You cannot start a chat with yourself');
    }

    // Respect block relationships
    const isBlocked = await this.messagingRepository.hasBlockRelationship(
      currentUserId,
      dto.participantTwoId
    );
    if (isBlocked) {
      throw new ForbiddenException('Cannot start a chat due to a block relationship');
    }

    const existing = await this.messagingRepository.findChatByParticipants(
      currentUserId,
      dto.participantTwoId
    );
    if (existing) {
      // Return the existing chat instead of throwing
      return {
        status: 'success',
        data: await this.formatChat(existing, currentUserId),
      };
    }

    const chat = await this.messagingRepository.createChat(currentUserId, dto.participantTwoId);
    const chatWithRelations = await this.messagingRepository.findChatByIdWithParticipants(
      chat.chatId
    );
    // emit new chat to other user
    const formattedForOther = await this.formatChat(chatWithRelations, dto.participantTwoId);
    this.websocketsService.emitToUser(dto.participantTwoId, 'chat:new', formattedForOther);
    return {
      status: 'success',
      data: await this.formatChat(chatWithRelations, currentUserId),
    };
  }

  async getChats(
    currentUserId: string,
    page: number,
    limit: number,
    filter: ChatFilter = ChatFilter.ALL
  ) {
    const { chats, total } = await this.messagingRepository.getChats(
      currentUserId,
      page,
      limit,
      filter
    );

    const formatted = await Promise.all(chats.map((chat) => this.formatChat(chat, currentUserId)));
    return {
      status: 'success',
      ...buildPaginationResponse(formatted, total, page, limit),
    };
  }

  async archiveChat(currentUserId: string, chatId: string) {
    await this.assertParticipant(chatId, currentUserId);
    await this.messagingRepository.setChatArchived(chatId, currentUserId, true);
    return { status: 'success', message: 'Chat archived' };
  }

  async getMessages(currentUserId: string, chatId: string, dto: GetMessagesReqDto) {
    await this.assertParticipant(chatId, currentUserId);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const { messages, total } = await this.messagingRepository.getMessages(
      chatId,
      page,
      limit,
      dto.before
    );

    return {
      status: 'success',
      ...buildPaginationResponse(
        messages.map((m) => plainToInstance(MessageResDto, m)),
        total,
        page,
        limit
      ),
    };
  }

  async sendMessage(currentUserId: string, dto: SendMessageDto) {
    await this.assertParticipant(dto.chatId, currentUserId);
    await this.assertNotBlocked(dto.chatId, currentUserId);
    this.assertMessagePayload(dto);

    const [isFirst, sender] = await Promise.all([
      this.messagingRepository.isFirstMessage(dto.chatId),
      this.userRepository.findById(currentUserId),
    ]);

    const message = await this.messagingRepository.createMessage(currentUserId, dto);

    const otherId = await this.getOtherParticipantId(dto.chatId, currentUserId);
    const [unreadCount] = await Promise.all([
      this.messagingRepository.getChatUnreadCountForUser(dto.chatId, otherId),
      this.messagingRepository.setChatArchived(dto.chatId, currentUserId, false),
      this.messagingRepository.setChatArchived(dto.chatId, otherId, false),
    ]);

    const formatted = plainToInstance(MessageResDto, message);

    this.websocketsService.emitToRoom(`chat:${dto.chatId}`, 'message:new', formatted);
    this.websocketsService.emitToUser(otherId, 'chat:update', {
      chatId: dto.chatId,
      unreadCount,
      lastMessage: formatted,
    });

    if (sender) {
      this.notificationsService.notifyNewMessage(otherId, sender, dto.chatId);

      if (isFirst) {
        Promise.all([
          this.userRepository.getPrimaryEmail(otherId),
          this.userRepository.findById(otherId),
        ]).then(([email, recipient]) => {
          if (email && recipient) {
            this.mailService.sendFirstMessageEmail(email, recipient.username, sender.username);
          }
        });
      }
    }

    return {
      status: 'success',
      data: formatted,
    };
  }

  async markRead(currentUserId: string, dto: MarkReadDto) {
    await this.assertParticipant(dto.chatId, currentUserId);

    const message = await this.messagingRepository.findMessage(dto.lastReadMessageId);
    if (!message || message.chatId !== dto.chatId) {
      throw new NotFoundException('Message not found in this chat');
    }

    await this.messagingRepository.markRead(dto.chatId, currentUserId, dto.lastReadMessageId);

    return { status: 'success', message: 'Marked as read' };
  }

  async markUnread(currentUserId: string, chatId: string) {
    await this.assertParticipant(chatId, currentUserId);
    await this.messagingRepository.markUnread(chatId, currentUserId);
    return { status: 'success', message: 'Chat marked as unread' };
  }

  async getUnreadCount(currentUserId: string) {
    const count = await this.messagingRepository.getTotalUnreadCount(currentUserId);
    return {
      status: 'success',
      data: { unreadCount: count },
    };
  }

  async isParticipant(chatId: string, userId: string): Promise<boolean> {
    return this.messagingRepository.isParticipant(chatId, userId);
  }

  async getOtherParticipantId(chatId: string, userId: string): Promise<string> {
    const chat = await this.messagingRepository.findChatById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    return chat.participantOneId === userId ? chat.participantTwoId : chat.participantOneId;
  }

  private async assertParticipant(chatId: string, userId: string): Promise<void> {
    const chat = await this.messagingRepository.findChatById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    const participant = await this.messagingRepository.isParticipant(chatId, userId);
    if (!participant) throw new ForbiddenException('You are not a participant in this chat');
  }

  private async assertNotBlocked(chatId: string, senderId: string): Promise<void> {
    const chat = await this.messagingRepository.findChatById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    const otherId =
      chat.participantOneId === senderId ? chat.participantTwoId : chat.participantOneId;

    const blocked = await this.messagingRepository.hasBlockRelationship(senderId, otherId);
    if (blocked) {
      throw new ForbiddenException('Cannot send message due to a block relationship');
    }
  }

  private assertMessagePayload(dto: SendMessageDto): void {
    if (dto.messageType === MessageType.TEXT && !dto.content?.trim()) {
      throw new BadRequestException('Text messages must have content');
    }
    if (dto.messageType === MessageType.TRACK_SHARE && !dto.sharedTrackId) {
      throw new BadRequestException('Track share messages must include a sharedTrackId');
    }
    if (dto.messageType === MessageType.PLAYLIST_SHARE && !dto.sharedPlaylistId) {
      throw new BadRequestException('Playlist share messages must include a sharedPlaylistId');
    }
  }

  private async formatChat(chat: any, currentUserId: string): Promise<ChatResDto> {
    const status = await this.messagingRepository.getChatStatus(chat.chatId, currentUserId);
    const unreadCount = await this.messagingRepository.getUnreadCount(
      chat.chatId,
      status?.lastReadMessageId ?? null
    );

    const otherParticipant =
      chat.participantOne?.userId === currentUserId ? chat.participantTwo : chat.participantOne;

    return plainToInstance(ChatResDto, {
      ...chat,
      isArchived: status?.isArchived ?? false,
      unreadCount,
      lastMessage: chat.lastMessage ?? null,
      otherUser: otherParticipant
        ? {
            userId: otherParticipant.userId,
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
            avatarUrl: otherParticipant.avatarUrl ?? null,
          }
        : null,
    });
  }
}
