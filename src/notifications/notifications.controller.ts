import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
          has_more: offset + safeLimit < result.total, // Returns true if there are more items
        },
      },
    };
  }
}
