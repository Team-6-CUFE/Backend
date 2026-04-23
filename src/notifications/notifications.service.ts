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

  async getNotifications(userId: string, limit: number, offset: number, type?: string) {
    const [notifications, total] = await this.notificationsRepository.getNotifications(
      userId,
      limit,
      offset,
      type
    );

    const formattedNotifications = notifications.map((notif) => {
      // Logic to populate the target based on what is attached to the notification
      let target = null;

      // NOTE: This assumes your Notification entity has a `track` or `playlist` relation.
      // Adjust the property names (e.g., track.trackId, track.coverImageUrl) to match your actual entities.
      if (notif.track) {
        target = {
          type: 'track',
          trackId: notif.track.trackId,
          title: notif.track.title,
          coverImageUrl: notif.track.coverImageUrl,
        };
      } else if (notif.playlist) {
        target = {
          type: 'playlist',
          playlistId: notif.playlist.playlistId,
          title: notif.playlist.title,
          coverImageUrl: notif.playlist.coverImageUrl,
        };
      }

      return {
        notificationId: notif.notificationId,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        activity: {
          activityId: `act_${notif.notificationId}`,
          activityType: notif.type,
          actor: {
            userId: notif.actor?.userId,
            username: notif.actor?.username,
            displayName: notif.actor?.username, // Falls back to username if display name isn't on the entity yet
            avatarUrl: notif.actor?.avatarUrl,
          },
          target,
          createdAt: notif.createdAt,
        },
      };
    });

    return { notifications: formattedNotifications, total };
  }

  // 2. The DELETE method (MAKE SURE THIS IS HERE AND INSIDE THE CLASS)
  async deleteNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType // Make sure NotificationType is imported at the top!
  ): Promise<void> {
    await this.notificationsRepository.deleteNotification(recipientId, actorId, type);
  }
}
