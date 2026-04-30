import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateCheckoutSessionDto } from './dto/createCheckOutSessionDto';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import {
  ApiCreateCheckout,
  ApiGetMySubscription,
  ApiCancelSubscription,
  ApiResumeSubscription,
} from './subscription.swagger';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // POST /subscriptions/checkout
  @ApiCreateCheckout()
  @Post('checkout')
  async createCheckout(@CurrentUser('sub') userId: string, @Body() dto: CreateCheckoutSessionDto) {
    console.log(dto);
    return this.subscriptionService.createCheckout(
      userId,
      dto.plan,
      dto.billingCycle,
      dto.paymentMethodId
    );
  }

  // GET /subscriptions/me
  @ApiGetMySubscription()
  @Get('me')
  async getMySubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.getMySubscription(userId);
  }

  // PATCH /subscriptions/cancel
  @ApiCancelSubscription()
  @Patch('cancel')
  async cancelSubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  // PATCH /subscriptions/resume
  @ApiResumeSubscription()
  @Patch('resume')
  async resumeSubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionService.resumeSubscription(userId);
  }
}
