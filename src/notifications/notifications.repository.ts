import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { UserFollow } from '../followers/entities/user-follows.entity';
import { DeviceToken } from './entities/device-token.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,

    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>
  ) {}

  async createNotification(
    type: NotificationType,
    recipientId: string,
    actorId: string,
    target?: { trackId?: string; playlistId?: string }
  ): Promise<Notification> {
    const notification = this.repo.create({
      type,
      recipientId,
      actorId,
      trackId: target?.trackId,
      playlistId: target?.playlistId,
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
      .leftJoinAndSelect('notification.track', 'track')
      .leftJoinAndSelect('notification.playlist', 'playlist')
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
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.repo.update({ recipientId, isRead: false }, { isRead: true });
  }

  async getFollowers(artistId: string): Promise<string[]> {
    const follows = await this.repo.manager.find(UserFollow, {
      where: { followed: artistId },
      select: ['follower'],
    });
    return follows.map((f) => f.follower);
  }

  async saveDeviceToken(userId: string, token: string, platform: string): Promise<void> {
    const existing = await this.deviceTokenRepo.findOne({
      where: { token, userId },
    });

    if (!existing) {
      const newToken = this.deviceTokenRepo.create({
        userId,
        token,
        platform,
      });
      await this.repo.manager.save(newToken);
    }
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await this.deviceTokenRepo.find({
      where: { userId },
      select: ['token'],
    });
    return devices.map((d) => d.token);
  }
}
