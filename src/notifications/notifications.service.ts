// notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
      let target = null;

      // Explicitly cover every notification type
      switch (notif.type) {
        case NotificationType.NEW_LIKE:
        case NotificationType.NEW_REPOST:
        case NotificationType.NEW_COMMENT:
        case NotificationType.NEW_POST:
          // These types can target either a track or a playlist
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
          break;

        case NotificationType.MESSAGE:
          // Messages target a specific message entity
          if (notif.message) {
            target = {
              type: 'message',
              messageId: notif.message.messageId,
              contentPreview: notif.message.content.substring(0, 50),
            };
          }
          break;

        case NotificationType.NEW_FOLLOWER:
          // Follows have no specific target resource as per the spec
          target = null;
          break;

        default:
          // Fallback just in case
          target = null;
          break;
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
            displayName: notif.actor?.username,
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

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const updated = await this.notificationsRepository.markAsRead(notificationId, userId);

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }
  }
}
