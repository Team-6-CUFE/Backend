// notifications.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>
  ) {}

  async createNotification(
    type: NotificationType,
    recipientId: string,
    actorId: string
  ): Promise<Notification> {
    const notification = this.repo.create({
      type,
      recipientId,
      actorId,
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
      // These are now active so the service can format the targets correctly
      // .leftJoinAndSelect('notification.track', 'track')
      // .leftJoinAndSelect('notification.playlist', 'playlist')
      // .leftJoinAndSelect('notification.message', 'message')
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
}
