import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { SubscriptionRepository } from './subscription.repository';
import { StripeService } from './stripe.service';
import { Subscription } from './entities/subscription.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    UserModule, // needed so UserRepository is available
  ],
  controllers: [SubscriptionController, WebhookController],
  providers: [SubscriptionService, SubscriptionRepository, StripeService],
})
export class SubscriptionModule {}
