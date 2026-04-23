import { Body, Controller, Post } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CreateChatDto } from './dto/api/create-chat.dto';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('chats')
  async createChat(@CurrentUser('sub') userId: string, @Body() dto: CreateChatDto) {
    return this.messagingService.createChat(userId, dto);
  }
}
