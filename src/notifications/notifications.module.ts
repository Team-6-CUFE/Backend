import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), WebsocketsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Required so FollowersService can use it
})
export class NotificationsModule {}
