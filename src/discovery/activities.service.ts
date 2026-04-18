import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity, ActivityType } from './entities/activity.entity';

@Injectable()
export class ActivitiesService {
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
}
