import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { ChatStatus } from './entities/chat-status.entity';
import { SendMessageDto } from './dto/ws/send-message.dto';
import { UserBlock } from '../followers/entities/user-blocks.entity';
import { ChatFilter } from './enums/chat-filter.enum';

@Injectable()
export class MessagingRepository {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ChatStatus)
    private readonly chatStatusRepo: Repository<ChatStatus>,
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>
  ) {}

  async findChatById(chatId: string): Promise<Chat | null> {
    return this.chatRepo.findOne({ where: { chatId } });
  }

  async findChatByIdWithParticipants(chatId: string): Promise<Chat | null> {
    return this.chatRepo.findOne({
      where: { chatId },
      relations: ['participantOne', 'participantTwo', 'lastMessage'],
    });
  }

  async findChatByParticipants(userOneId: string, userTwoId: string): Promise<Chat | null> {
    return this.chatRepo
      .createQueryBuilder('chat')
      .where(
        '(chat.participantOneId = :a AND chat.participantTwoId = :b) OR (chat.participantOneId = :b AND chat.participantTwoId = :a)',
        { a: userOneId, b: userTwoId }
      )
      .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
      .leftJoinAndSelect('chat.participantOne', 'participantOne')
      .leftJoinAndSelect('chat.participantTwo', 'participantTwo')
      .getOne();
  }

  async isFirstMessage(chatId: string): Promise<boolean> {
    const count = await this.messageRepo.count({ where: { chatId } });
    return count === 0;
  }

  async getChatUnreadCountForUser(chatId: string, userId: string): Promise<number> {
    const status = await this.chatStatusRepo.findOne({ where: { chatId, userId } });
    return this.getUnreadCount(chatId, status?.lastReadMessageId ?? null);
  }

  async createChat(participantOneId: string, participantTwoId: string): Promise<Chat> {
    const chat = this.chatRepo.create({ participantOneId, participantTwoId });
    return this.chatRepo.save(chat);
  }

  async getChats(
    userId: string,
    page: number,
    limit: number,
    filter: ChatFilter = ChatFilter.ALL
  ): Promise<{ chats: Chat[]; total: number }> {
    const qb = this.chatRepo
      .createQueryBuilder('chat')
      .where('(chat.participantOneId = :userId OR chat.participantTwoId = :userId)', { userId })
      .andWhere('chat.deletedAt IS NULL')
      .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
      .leftJoinAndSelect('chat.participantOne', 'participantOne')
      .leftJoinAndSelect('chat.participantTwo', 'participantTwo')
      .orderBy('chat.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter === ChatFilter.ARCHIVED) {
      qb.innerJoin(
        'chat_status',
        'cs',
        'cs.chat_id = chat.chatId AND cs.user_id = :userId AND cs.is_archived = true',
        { userId }
      );
    } else if (filter === ChatFilter.UNREAD) {
      qb.innerJoin(
        'chat_status',
        'cs',
        'cs.chat_id = chat.chatId AND cs.user_id = :userId'
      ).andWhere(
        `EXISTS (
        SELECT 1 FROM messages m
        WHERE m.chat_id = chat.chat_id
        AND m.sender_id <> :userId
        AND (cs.last_read_message_id IS NULL
          OR m.created_at > (
            SELECT created_at FROM messages WHERE message_id = cs.last_read_message_id
          ))
      )`
      );
    } else {
      // ALL — exclude archived
      qb.leftJoin(
        'chat_status',
        'cs',
        'cs.chat_id = chat.chatId AND cs.user_id = :userId'
      ).andWhere('(cs.is_archived IS NULL OR cs.is_archived = false)');
    }

    const [chats, total] = await qb.getManyAndCount();
    return { chats, total };
  }

  async isParticipant(chatId: string, userId: string): Promise<boolean> {
    const count = await this.chatRepo
      .createQueryBuilder('chat')
      .where('chat.chatId = :chatId', { chatId })
      .andWhere('(chat.participantOneId = :userId OR chat.participantTwoId = :userId)', { userId })
      .getCount();
    return count > 0;
  }

  async setChatArchived(chatId: string, userId: string, isArchived: boolean): Promise<void> {
    await this.chatStatusRepo.upsert(
      { chatId, userId, isArchived },
      { conflictPaths: ['chatId', 'userId'] }
    );
  }

  async getMessages(
    chatId: string,
    page: number,
    limit: number,
    before?: string
  ): Promise<{ messages: Message[]; total: number }> {
    // Total is always the full message count for the chat, regardless of cursor
    const total = await this.messageRepo.count({
      where: { chatId },
    });

    const qb = this.messageRepo
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .leftJoinAndSelect('message.sender', 'sender')
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (before) {
      const cursor = await this.messageRepo.findOne({ where: { messageId: before } });
      if (cursor) {
        qb.andWhere('message.createdAt < :before', { before: cursor.createdAt });
      }
    }

    const messages = await qb.getMany();
    return { messages, total };
  }

  async createMessage(senderId: string, dto: SendMessageDto): Promise<Message> {
    const message = this.messageRepo.create({
      chatId: dto.chatId,
      senderId,
      messageType: dto.messageType,
      content: dto.content ?? null,
      sharedTrackId: dto.sharedTrackId ?? null,
      sharedPlaylistId: dto.sharedPlaylistId ?? null,
    });

    const saved = await this.messageRepo.save(message);

    // Keep last_message_id on the chat in sync
    await this.chatRepo.update(dto.chatId, { lastMessageId: saved.messageId });

    return saved;
  }

  async findMessage(messageId: string): Promise<Message | null> {
    return this.messageRepo.findOne({ where: { messageId } });
  }

  async getChatStatus(chatId: string, userId: string): Promise<ChatStatus | null> {
    return this.chatStatusRepo.findOne({ where: { chatId, userId } });
  }

  async markRead(chatId: string, userId: string, lastReadMessageId: string): Promise<void> {
    await this.chatStatusRepo.upsert(
      {
        chatId,
        userId,
        lastReadMessageId,
        lastReadAt: new Date(),
      },
      { conflictPaths: ['chatId', 'userId'] }
    );
  }

  async markUnread(chatId: string, userId: string): Promise<void> {
    await this.chatStatusRepo.upsert(
      {
        chatId,
        userId,
        lastReadMessageId: null,
        lastReadAt: null,
      },
      { conflictPaths: ['chatId', 'userId'] }
    );
  }

  async getUnreadCount(chatId: string, lastReadMessageId: string | null): Promise<number> {
    if (!lastReadMessageId) {
      return this.messageRepo.count({
        where: { chatId },
      });
    }

    const lastRead = await this.messageRepo.findOne({
      where: { messageId: lastReadMessageId },
    });
    if (!lastRead) return 0;

    return this.messageRepo.count({
      where: {
        chatId,
        createdAt: LessThan(lastRead.createdAt),
      },
    });
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await this.chatRepo
      .createQueryBuilder('chat')
      .select('COUNT(m.message_id)', 'count')
      .where('(chat.participantOneId = :userId OR chat.participantTwoId = :userId)', { userId })
      .andWhere('chat.deletedAt IS NULL')
      .leftJoin('chat_status', 'cs', 'cs.chat_id = chat.chat_id AND cs.user_id = :userId', {
        userId,
      })
      .leftJoin(
        'messages',
        'm',
        `m.chat_id = chat.chat_id
       AND m.sender_id <> :userId
       AND (cs.last_read_message_id IS NULL
         OR m.created_at > (
           SELECT created_at FROM messages WHERE message_id = cs.last_read_message_id
         ))`,
        { userId }
      )
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }

  async hasBlockRelationship(userOneId: string, userTwoId: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: [
        { blocker: userOneId, blocked: userTwoId },
        { blocker: userTwoId, blocked: userOneId },
      ],
    });
    return count > 0;
  }
}
