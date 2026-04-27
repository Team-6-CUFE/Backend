import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>
  ) {}

  async findOne(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { user: { userId } },
    });
  }

  async createSubscription(user: User, stripeCustomerId: string): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      user,
      stripeCustomerId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
    });
    return this.subscriptionRepository.save(subscription);
  }
}
