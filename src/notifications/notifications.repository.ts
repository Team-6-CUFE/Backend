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

  // --- ADD THIS METHOD ---
  async getNotifications(
    userId: string,
    limit: number,
    offset: number,
    type?: string
  ): Promise<[Notification[], number]> {
    const query = this.repo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      // UNCOMMENT THESE when Tracks and Playlists are added to the Notification Entity:
      // .leftJoinAndSelect('notification.track', 'track')
      // .leftJoinAndSelect('notification.playlist', 'playlist')
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    return query.getManyAndCount();
  }

  // Add this inside notifications.repository.ts
  async deleteNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType
  ): Promise<void> {
    // Note: If your entity uses relation objects instead of raw IDs,
    // you might need to use `recipient: { userId: recipientId }` instead.
    await this.repo.delete({
      recipientId,
      actorId,
      type,
    });
  }
}
