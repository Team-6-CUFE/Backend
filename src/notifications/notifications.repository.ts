// notifications.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { UserFollow } from '../followers/entities/user-follows.entity';
import { DeviceToken } from './entities/device-token-entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>
  ) {}

  async createNotification(
    type: NotificationType,
    recipientId: string,
    actorId: string,
    target?: { trackId?: string; playlistId?: string } // <-- 1. Add target parameter
  ): Promise<Notification> {
    const notification = this.repo.create({
      type,
      recipientId,
      actorId,
      trackId: target?.trackId, // <-- 2. Save trackId
      playlistId: target?.playlistId, // <-- 3. Save playlistId
    });
    return this.repo.save(notification);
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.repo.count({
      where: { recipientId, isRead: false },
    });
  }

  async getNotifications(
    userId: string,
    limit: number,
    offset: number,
    type?: string
  ): Promise<[Notification[], number]> {
    const query = this.repo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      .leftJoinAndSelect('notification.track', 'track') // <-- 4. Uncomment track join
      .leftJoinAndSelect('notification.playlist', 'playlist') // <-- 5. Uncomment playlist join
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    return query.getManyAndCount();
  }

  async deleteNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType
  ): Promise<void> {
    await this.repo.delete({
      recipientId,
      actorId,
      type,
    });
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<boolean> {
    const result = await this.repo.update({ notificationId, recipientId }, { isRead: true });
    // Returns true if a row was actually updated, false if it wasn't found
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.repo.update({ recipientId, isRead: false }, { isRead: true });
  }

  async getFollowers(artistId: string): Promise<string[]> {
    // This assumes you're injecting the UserFollow repository or using the manager
    const follows = await this.repo.manager.find(UserFollow, {
      where: { followed: artistId },
      select: ['follower'],
    });
    return follows.map((f) => f.follower);
  }

  // Inside NotificationsRepository
  async saveDeviceToken(userId: string, token: string, platform: string): Promise<void> {
    // Check if this specific token already exists for this user to avoid spamming the DB
    const existing = await this.repo.manager.findOne(DeviceToken, {
      where: { token, userId },
    });

    if (!existing) {
      const newToken = this.repo.manager.create(DeviceToken, {
        userId,
        token,
        platform,
      });
      await this.repo.manager.save(newToken);
    }
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await this.repo.manager.find(DeviceToken, {
      where: { userId },
      select: ['token'],
    });
    return devices.map((d) => d.token);
  }
}
