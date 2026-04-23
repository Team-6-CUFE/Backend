import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { WebsocketsModule } from '../websockets/websockets.module';
import { NotificationsRepository } from './notifications.repository';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), WebsocketsModule, SettingsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository], // Added Repository here
  exports: [NotificationsService],
})
export class NotificationsModule {}
