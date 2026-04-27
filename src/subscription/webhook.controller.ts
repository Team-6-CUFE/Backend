import { Controller, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe signature');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    await this.subscriptionService.handleWebhookEvent(event);

    return { received: true };
  }
}
