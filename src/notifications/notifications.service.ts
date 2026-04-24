/* eslint-disable no-restricted-syntax */
// notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { User } from '../user/entities/user.entity';
import { NotificationType } from './entities/notification.entity';
import { getFirebaseApp } from '../common/utilities/captcha.util'; // Double check this path
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly websocketsService: WebsocketsService,
    private readonly settingsService: SettingsService
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

    await this.sendPushNotification(
      recipientId,
      'New Follower',
      `${actor.username} started following you!`,
      'newFollower' // Matches data.device.newFollower
    );
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
              coverImageUrl: notif.track.coverImage,
            };
          } else if (notif.playlist) {
            target = {
              type: 'playlist',
              playlistId: notif.playlist.playlistId,
              title: notif.playlist.title,
              coverImageUrl: notif.playlist.coverImage,
            };
          }
          break;

        case NotificationType.MESSAGE:
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

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.getUnreadCount(userId);
  }

  async notifyNewLike(
    recipientId: string,
    actor: any, // Accepts the user object
    target: { trackId?: string; playlistId?: string }
  ) {
    // 1. Save to database
    const notification = await this.notificationsRepository.createNotification(
      NotificationType.NEW_LIKE,
      recipientId,
      actor.userId,
      target
    );

    // 2. Get fresh unread count
    const unreadCount = await this.notificationsRepository.getUnreadCount(recipientId);

    // 3. Emit the real-time event
    this.websocketsService.emitToUser(recipientId, 'new_notification', {
      notification: {
        notificationId: notification.notificationId,
        type: NotificationType.NEW_LIKE,
        actor: {
          userId: actor.userId,
          username: actor.username,
          avatarUrl: actor.avatarUrl,
        },
        target, // Passes the trackId or playlistId to the frontend
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    await this.sendPushNotification(
      recipientId,
      'New Like',
      `${actor.username} liked your ${target.trackId ? 'track' : 'playlist'}.`,
      'likes_plays', // Matches data.device.likes_plays in your SettingsService
      target
    );
  }

  async notifyNewRepost(
    recipientId: string,
    actor: any,
    target: { trackId?: string; playlistId?: string }
  ) {
    // 1. Save to DB
    const notification = await this.notificationsRepository.createNotification(
      NotificationType.NEW_REPOST,
      recipientId,
      actor.userId,
      target
    );

    // 2. Get unread count
    const unreadCount = await this.notificationsRepository.getUnreadCount(recipientId);

    // 3. Emit real-time
    this.websocketsService.emitToUser(recipientId, 'new_notification', {
      notification: {
        notificationId: notification.notificationId,
        type: NotificationType.NEW_REPOST,
        actor: {
          userId: actor.userId,
          username: actor.username,
          avatarUrl: actor.avatarUrl,
        },
        target,
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    await this.sendPushNotification(
      recipientId,
      'New Repost',
      `${actor.username} reposted your ${target.trackId ? 'track' : 'playlist'}.`,
      'repost', // Matches data.device.repost
      target
    );
  }

  async notifyNewComment(
    recipientId: string,
    actor: any,
    target: { trackId: string; commentId: string; content: string },
    isReply: boolean = false // <--- This default handles both cases
  ) {
    // 1. Save to DB
    const notification = await this.notificationsRepository.createNotification(
      NotificationType.NEW_COMMENT,
      recipientId,
      actor.userId,
      { trackId: target.trackId }
    );

    const unreadCount = await this.notificationsRepository.getUnreadCount(recipientId);

    // 2. Emit real-time
    this.websocketsService.emitToUser(recipientId, 'new_notification', {
      notification: {
        notificationId: notification.notificationId,
        type: NotificationType.NEW_COMMENT,
        actor: {
          userId: actor.userId,
          username: actor.username,
          avatarUrl: actor.avatarUrl,
        },
        target: {
          ...target,
          isReply,
        },
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    await this.sendPushNotification(
      recipientId,
      isReply ? 'New Reply' : 'New Comment',
      `${actor.username} ${isReply ? 'replied to your comment' : 'commented on your track'}: "${target.content}"`,
      'comment', // Matches data.device.comment
      { trackId: target.trackId, commentId: target.commentId }
    );
  }

  async notifyNewPost(artist: any, trackId: string) {
    // 1. Find all followers
    const followers = await this.notificationsRepository.getFollowers(artist.userId);

    // 2. Prepare the notification data
    // In a real production app, you'd use a "Bulk Insert" here for the DB
    for (const followerId of followers) {
      // Save to DB
      // eslint-disable-next-line no-await-in-loop
      const notification = await this.notificationsRepository.createNotification(
        NotificationType.NEW_POST,
        followerId,
        artist.userId,
        { trackId }
      );

      // eslint-disable-next-line no-await-in-loop
      const unreadCount = await this.notificationsRepository.getUnreadCount(followerId);

      // Emit via WebSocket
      this.websocketsService.emitToUser(followerId, 'new_notification', {
        notification: {
          notificationId: notification.notificationId,
          type: NotificationType.NEW_POST,
          actor: {
            userId: artist.userId,
            username: artist.username,
            avatarUrl: artist.avatarUrl,
          },
          target: { trackId },
          createdAt: notification.createdAt,
        },
        unreadCount,
      });

      // eslint-disable-next-line no-await-in-loop
      await this.sendPushNotification(
        followerId,
        'New Track',
        `${artist.username} just uploaded a new track!`,
        'newPost', // Matches data.device.newPost
        { trackId }
      );
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    settingKey: string,
    data?: any
  ) {
    try {
      // 1. Permission Check
      const settings = await this.settingsService.getNotificationSettings(userId);
      const deviceSettings = settings?.data?.device as Record<string, any>;

      if (
        !deviceSettings ||
        deviceSettings[settingKey] === false ||
        deviceSettings[settingKey] === 'off'
      )
        return;

      // 2. Token Retrieval & Formatting
      const rawTokens = await this.notificationsRepository.getUserDeviceTokens(userId);
      const tokens: string[] = (rawTokens || [])
        .map((t: any) => (typeof t === 'string' ? t : t?.token)?.trim())
        .filter((t): t is string => !!t && t.length > 0);

      if (tokens.length === 0) return;

      // 3. Data Flattening (FCM requires strings)
      const fcmData: Record<string, string> = { click_action: 'FLUTTER_NOTIFICATION_CLICK' };
      if (data) {
        Object.entries(data).forEach(([k, v]) => {
          if (v != null) fcmData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        });
      }

      // 4. Dispatch
      await getMessaging(getFirebaseApp()).sendEachForMulticast({
        notification: { title, body },
        data: fcmData,
        tokens,
      });
    } catch (error: any) {
      console.error(`Push error: ${error?.message}`);
    }
  }

  // notifications.service.ts

  async registerDevice(userId: string, token: string, platform: string) {
    return this.notificationsRepository.saveDeviceToken(userId, token, platform);
  }
}
