import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { ChatStatus } from './entities/chat-status.entity';
import { MessagingRepository } from './messaging.repository';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { MessagingController } from './messaging.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UserBlock } from '../followers/entities/user-blocks.entity';
import { User } from '../user/entities/user.entity';
import { UserEmail } from '../user/entities/user-email.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, ChatStatus, UserBlock, User, UserEmail]),
    WebsocketsModule,
    NotificationsModule,
    MailModule,
    UserModule,
  ],
  providers: [MessagingRepository, MessagingService, MessagingGateway],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
