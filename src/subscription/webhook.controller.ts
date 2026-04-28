import {
  Controller,
  Post,
  Headers,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { Public } from '../authentication/decorators/public.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService
  ) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe signature');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    await this.subscriptionService.handleWebhookEvent(event);

    return { received: true };
  }
}
