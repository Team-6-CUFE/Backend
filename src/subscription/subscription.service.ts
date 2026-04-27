import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UserRepository } from '../user/user.repository';
import { SubscriptionRepository } from './subscription.repository';
import { StripeService } from './stripe.service';
import { Subscription, SubscriptionStatus, SubscriptionPlan } from './entities/subscription.entity';

import { PlanType } from './dto/createCheckOutSessionDto';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService
  ) {}

  private async getOrCreateSubscription(userId: string): Promise<Subscription> {
    let subscription = await this.subscriptionRepository.findOne(userId);
    if (!subscription) {
      const user = await this.userRepository.findUserWithEmails(userId);
      if (!user) {
        throw new BadRequestException('user not found');
      }

      const primaryEmail = user.emails?.find((e) => e.isPrimary);
      if (!primaryEmail) {
        throw new BadRequestException('User has no priamry email address');
      }
      const stripeCustomer = await this.stripeService.createCustomer(
        primaryEmail.email,
        user.username,
        user.userId
      );
      subscription = await this.subscriptionRepository.createSubscription(user, stripeCustomer.id);
    }
    return subscription;
  }

  private getPriceId(plan: PlanType, billingCycle: 'monthly' | 'yearly'): string {
    if (plan === PlanType.PRO) {
      return billingCycle === 'monthly'
        ? (this.configService.get<string>('STRIPE_ARTIST_PRO_PRICE_MONTHLY') as string)
        : (this.configService.get<string>('STRIPE_ARTIST_PRO_PRICE_YEARLY') as string);
    }
    return billingCycle === 'monthly'
      ? (this.configService.get<string>('STRIPE_GO_PLUS_PRICE_MONTHLY') as string)
      : (this.configService.get<string>('STRIPE_GO_PLUS_PRICE_YEARLY') as string);
  }

  private isPaidPlan(plan: SubscriptionPlan): boolean {
    return (
      plan === SubscriptionPlan.PRO_MONTHLY ||
      plan === SubscriptionPlan.PRO_YEARLY ||
      plan === SubscriptionPlan.GO_PLUS_MONTHLY ||
      plan === SubscriptionPlan.GO_PLUS_YEARLY
    );
  }
  // ─── Create Checkout ───────────────────────────────────────────────────────

  async createCheckout(
    userId: string,
    plan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    paymentMethodId: string
  ): Promise<{ status: string; message: string }> {
    const subscription = await this.getOrCreateSubscription(userId);

    // Already on a paid plan
    if (this.isPaidPlan(subscription.plan) && subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Get the right price ID
    const priceId = this.getPriceId(plan, billingCycle);

    // Attach payment method to Stripe customer
    await this.stripeService.attachPaymentMethod(paymentMethodId, subscription.stripeCustomerId);

    // Create subscription in Stripe
    const stripeSubscription = await this.stripeService.createStripeSubscription(
      subscription.stripeCustomerId,
      priceId
    );

    // Check payment status
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    if (paymentIntent?.status === 'succeeded') {
      return {
        status: 'success',
        message: 'Subscription created successfully',
      };
    }

    if (paymentIntent?.status === 'requires_payment_method') {
      throw new BadRequestException('Your card was declined');
    }

    return {
      status: 'pending',
      message: 'Payment is being processed',
    };
  }
}
