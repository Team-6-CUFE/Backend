import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity, ActivityType } from './entities/activity.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>
  ) {}

  async createActivity(
    activityType: ActivityType,
    targetId: string,
    userId: string,
    targetUserId: string | null
  ): Promise<Activity> {
    const activity = this.activityRepository.create({
      activityType,
      targetId,
      userId,
      targetUserId,
    });
    return this.activityRepository.save(activity);
  }

  async getActivitiesByUserIds(
    userIds: string[],
    page: number,
    limit: number,
    includeReposts: boolean
  ): Promise<Activity[]> {
    const offset = (page - 1) * limit;
    const types = includeReposts
      ? [
          ActivityType.TRACK_POSTED,
          ActivityType.TRACK_REPOST,
          ActivityType.PLAYLIST_POSTED,
          ActivityType.PLAYLIST_REPOST,
        ]
      : [ActivityType.TRACK_POSTED, ActivityType.PLAYLIST_POSTED];
    return this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.userId IN (:...userIds)', { userIds })
      .andWhere('activity.activityType IN (:...types)', {
        types,
      })
      .orderBy('activity.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  // Add this inside activity.service.ts
  async deleteActivity(
    activityType: ActivityType,
    targetId: string,
    userId: string
  ): Promise<void> {
    await this.activityRepository.delete({
      activityType,
      targetId,
      userId,
    });
  }
}
