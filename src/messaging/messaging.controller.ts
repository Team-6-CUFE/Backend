import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateChatDto } from './dto/api/create-chat.dto';
import { GetChatsReqDto } from './dto/api/get-chats-req.dto';
import { GetMessagesReqDto } from './dto/api/get-messages-req.dto';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import {
  ApiCreateChat,
  ApiGetChats,
  ApiGetMessages,
  ApiArchiveChat,
  ApiMarkUnread,
  ApiGetUnreadCount,
} from './messaging.swagger';
import { ChatResDto } from './dto/chat-res.dto';
import { PaginationDto } from './dto/api/pagination.dto';
import { MessageResDto } from './dto/message-res.dto';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @ApiCreateChat()
  @Post('chats')
  async createChat(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChatDto
  ): Promise<{ status: string; data: ChatResDto }> {
    return this.messagingService.createChat(userId, dto);
  }

  @ApiGetChats()
  @Get('chats')
  async getChats(
    @CurrentUser('sub') userId: string,
    @Query() dto: GetChatsReqDto
  ): Promise<{ status: string; data: ChatResDto[]; pagination: PaginationDto }> {
    return this.messagingService.getChats(userId, dto.page ?? 1, dto.limit ?? 20, dto.filter);
  }

  @ApiGetMessages()
  @Get('chats/:chatId')
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query() dto: GetMessagesReqDto
  ): Promise<{ status: string; data: MessageResDto[]; pagination: PaginationDto }> {
    return this.messagingService.getMessages(userId, chatId, dto);
  }

  @ApiArchiveChat()
  @Put('chats/:chatId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveChat(
    @CurrentUser('sub') userId: string,
    @Param('chatId', ParseUUIDPipe) chatId: string
  ): Promise<{ status: string; message: string }> {
    return this.messagingService.archiveChat(userId, chatId);
  }

  @ApiMarkUnread()
  @Put('chats/:chatId/mark-unread')
  @HttpCode(HttpStatus.OK)
  async markUnread(
    @CurrentUser('sub') userId: string,
    @Param('chatId', ParseUUIDPipe) chatId: string
  ): Promise<{ status: string; message: string }> {
    return this.messagingService.markUnread(userId, chatId);
  }

  @ApiGetUnreadCount()
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('sub') userId: string
  ): Promise<{ status: string; data: { unreadCount: number } }> {
    return this.messagingService.getUnreadCount(userId);
  }
}
