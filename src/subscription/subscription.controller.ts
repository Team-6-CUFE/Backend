import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateCheckoutSessionDto } from './dto/createCheckOutSessionDto';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // POST /subscriptions/checkout
  @Post('checkout')
  async createCheckout(@CurrentUser('sub') userId: string, @Body() dto: CreateCheckoutSessionDto) {
    return this.subscriptionService.createCheckout(
      userId,
      dto.plan,
      dto.billingCycle,
      dto.paymentMethodId
    );
  }

  // GET /subscriptions/me
  @Get('me')
  async getMySubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.getMySubscription(userId);
  }

  // PATCH /subscriptions/cancel
  @Patch('cancel')
  async cancelSubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  // PATCH /subscriptions/resume
  @Patch('resume')
  async resumeSubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.resumeSubscription(userId);
  }
}
