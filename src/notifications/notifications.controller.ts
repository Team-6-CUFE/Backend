import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Patch,
  Param,
  ParseUUIDPipe,
  Body,
  Put,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import {
  ApiGetNotifications,
  ApiMarkNotificationRead,
  ApiMarkAllNotificationsRead,
  ApiGetNotificationSettings,
  ApiUpdateNotificationSettings,
  ApiGetUnreadCount,
  ApiRegisterDevice,
} from './notifications.swagger';
import { SettingsService } from '../settings/settings.service';
import { UpdateNotificationsDto } from '../settings/dtos/update-notifications.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService
  ) {}

  @ApiGetNotifications()
  @Get()
  async getNotifications(
    @CurrentUser('sub') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('type') type?: string
  ) {
    // Enforce max limit of 50 as per your spec
    const safeLimit = Math.min(limit, 50);

    const result = await this.notificationsService.getNotifications(
      userId,
      safeLimit,
      offset,
      type
    );

    return {
      status: 'success',
      data: {
        notifications: result.notifications,
        pagination: {
          limit: safeLimit,
          offset,
          total: result.total,
          hasMore: offset + safeLimit < result.total,
        },
      },
    };
  }

  @Patch(':notification_id/read')
  @ApiMarkNotificationRead()
  async markAsRead(
    @Param('notification_id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('sub') userId: string
  ) {
    await this.notificationsService.markAsRead(notificationId, userId);

    return {
      status: 'success',
      message: 'Notification marked as read',
    };
  }

  @ApiMarkAllNotificationsRead()
  @Patch('read-all')
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    await this.notificationsService.markAllAsRead(userId);

    return {
      status: 'success',
      message: 'All notifications marked as read',
    };
  }

  @Get('settings')
  @ApiGetNotificationSettings()
  async getSettings(@CurrentUser('sub') userId: string) {
    return this.settingsService.getNotificationSettings(userId);
  }

  @Put('settings')
  @ApiUpdateNotificationSettings()
  async updateSettings(
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateNotificationsDto
  ) {
    return this.settingsService.updateNotificationSettings(userId, updateDto);
  }

  @Get('unread-count')
  @ApiGetUnreadCount()
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);

    return {
      status: 'success',
      data: {
        unreadCount: count,
      },
    };
  }

  @ApiRegisterDevice()
  @Post('register-device')
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body('token') token: string,
    @Body('platform') platform: string
  ) {
    await this.notificationsService.registerDevice(userId, token, platform);
    return {
      status: 'success',
      message: 'Device token registered successfully',
    };
  }
}
