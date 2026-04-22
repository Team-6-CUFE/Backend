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
}
