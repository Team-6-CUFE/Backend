// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { User } from '../user/entities/user.entity';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly websocketsService: WebsocketsService
  ) {}

  // Existing method
  async notifyNewFollower(recipientId: string, actor: User) {
    const notification = await this.notificationsRepository.createNotification(
      NotificationType.NEW_FOLLOWER,
      recipientId,
      actor.userId
    );
    const unreadCount = await this.notificationsRepository.getUnreadCount(recipientId);

    this.websocketsService.emitToUser(recipientId, 'new_notification', {
      notification: {
        id: notification.notificationId,
        type: notification.type,
        createdAt: notification.createdAt,
        actor: {
          userId: actor.userId,
          username: actor.username,
          avatarUrl: actor.avatarUrl,
        },
      },
      unreadCount,
    });
  }

  // --- ADD THIS METHOD ---
  async getNotifications(userId: string, limit: number, offset: number, type?: string) {
    const [notifications, total] = await this.notificationsRepository.getNotifications(
      userId,
      limit,
      offset,
      type
    );

    const formattedNotifications = notifications.map((notif) => ({
      notification_id: notif.notificationId,
      is_read: notif.isRead,
      created_at: notif.createdAt,
      activity: {
        activity_id: `act_${notif.notificationId}`,
        activity_type: notif.type,
        actor: {
          user_id: notif.actor?.userId,
          username: notif.actor?.username,
          display_name: notif.actor?.username, // Add display_name if available
          avatar_url: notif.actor?.avatarUrl,
        },
        target: null, // Logic for track/playlist targets goes here
        created_at: notif.createdAt,
      },
    }));

    return { notifications: formattedNotifications, total };
  }

  // Add this inside notifications.service.ts
  async deleteNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType
  ): Promise<void> {
    // We pass this down to your custom repository to handle the DB deletion
    await this.notificationsRepository.deleteNotification(recipientId, actorId, type);
  }
}
