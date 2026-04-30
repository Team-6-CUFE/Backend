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

  private resolveBillingCycle(plan: SubscriptionPlan): 'monthly' | 'yearly' | null {
    if (plan === SubscriptionPlan.FREE) return null;

    const yearlyPlans = [SubscriptionPlan.PRO_YEARLY, SubscriptionPlan.GO_PLUS_YEARLY];
    return yearlyPlans.includes(plan) ? 'yearly' : 'monthly';
  }
  // ─── Create Checkout ───────────────────────────────────────────────────────

  async createCheckout(
    userId: string,
    plan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    paymentMethodId: string
  ): Promise<{ status: string; message: string }> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (this.isPaidPlan(subscription.plan) && subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('User already has an active subscription');
    }

    const priceId = this.getPriceId(plan, billingCycle);

    await this.stripeService.attachPaymentMethod(paymentMethodId, subscription.stripeCustomerId);

    const stripeSubscription = await this.stripeService.createStripeSubscription(
      subscription.stripeCustomerId,
      priceId
    );

    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    // Declined immediately — no need to wait
    if (paymentIntent?.status === 'requires_payment_method') {
      throw new BadRequestException('Your card was declined');
    }

    // Already succeeded synchronously (rare but possible)
    if (paymentIntent?.status === 'succeeded') {
      await this.userRepository.update(userId, { plan });
      return { status: 'success', message: 'Subscription created successfully' };
    }

    // ⏳ Payment is processing — wait for webhook to update the DB
    const result = await this.pollSubscriptionStatus(subscription.stripeCustomerId);

    if (result === 'active') {
      await this.userRepository.update(userId, { plan });
      return { status: 'success', message: 'Subscription created successfully' };
    }

    if (result === 'failed') {
      throw new BadRequestException('Payment failed');
    }

    throw new BadRequestException('Payment timed out, please check your subscription status');
  }

  // ─── Poll DB until webhook updates it ─────────────────────────────────────

  private pollSubscriptionStatus(
    stripeCustomerId: string,
    intervalMs = 1000,
    timeoutMs = 30000
  ): Promise<'active' | 'failed' | 'timeout'> {
    return new Promise((resolve) => {
      let interval: ReturnType<typeof setInterval>;

      const timeout = setTimeout(() => {
        clearInterval(interval);
        resolve('timeout');
      }, timeoutMs);

      interval = setInterval(async () => {
        const subscription =
          await this.subscriptionRepository.findOneByCustomerId(stripeCustomerId);

        if (subscription?.status === SubscriptionStatus.ACTIVE) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve('active');
        } else if (subscription?.status === SubscriptionStatus.PAST_DUE) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve('failed');
        }
      }, intervalMs);
    });
  }
  // ─── Get My Subscription ───────────────────────────────────────────────────

  async getMySubscription(userId: string): Promise<{
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    billingCycle: 'monthly' | 'yearly' | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string | null;
  }> {
    const subscription = await this.subscriptionRepository.findOne(userId);

    if (!subscription) {
      return {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
      };
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: this.resolveBillingCycle(subscription.plan),
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
    };
  }

  // ─── Cancel Subscription ───────────────────────────────────────────────────

  async cancelSubscription(userId: string): Promise<{ message: string }> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (!this.isPaidPlan(subscription.plan) || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('No active subscription to cancel');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is already scheduled for cancellation');
    }

    // Tell Stripe to cancel at period end
    await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

    // Sync DB immediately — don't wait for webhook
    await this.subscriptionRepository.updateSubscription(subscription.stripeCustomerId, {
      cancelAtPeriodEnd: true,
    });

    return {
      message: `Your subscription will remain active until ${subscription.currentPeriodEnd?.toDateString()}`,
    };
  }

  // ─── Resume Subscription ──────────────────────────────────────────────────

  async resumeSubscription(userId: string): Promise<{ message: string }> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not scheduled for cancellation');
    }

    await this.stripeService.resumeSubscription(subscription.stripeSubscriptionId);

    await this.subscriptionRepository.updateSubscription(subscription.stripeCustomerId, {
      cancelAtPeriodEnd: false,
    });

    return { message: 'Subscription resumed successfully' };
  }

  // ─── Webhook Event Handler ─────────────────────────────────────────────────

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;
        const lineItem = invoice.lines.data[0];

        const priceId = (lineItem as any)?.pricing?.price_details?.price ?? lineItem?.price?.id;

        const stripeSubscriptionId =
          (lineItem as any)?.parent?.subscription_item_details?.subscription ??
          (invoice.subscription as string);

        const currentPeriodStart = new Date(lineItem.period.start * 1000);
        const currentPeriodEnd = new Date(lineItem.period.end * 1000);

        if (!priceId) break;

        const plan = this.resolvePlanFromPriceId(priceId);
        if (!plan) break;

        await this.subscriptionRepository.updateSubscription(stripeCustomerId, {
          plan,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        });

        const sub = await this.subscriptionRepository.findOneByCustomerId(stripeCustomerId);
        if (sub?.user?.userId) {
          await this.userRepository.update(sub.user.userId, { plan });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const stripeCustomerId = stripeSub.customer as string;

        await this.subscriptionRepository.updateSubscription(stripeCustomerId, {
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const stripeCustomerId = stripeSub.customer as string;

        await this.subscriptionRepository.updateSubscription(stripeCustomerId, {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: undefined,
          currentPeriodStart: undefined,
          stripeSubscriptionId: undefined,
        });

        const sub = await this.subscriptionRepository.findOneByCustomerId(stripeCustomerId);
        if (sub?.user?.userId) {
          await this.userRepository.update(sub.user.userId, { plan: SubscriptionPlan.FREE });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        await this.subscriptionRepository.updateSubscription(stripeCustomerId, {
          status: SubscriptionStatus.PAST_DUE,
        });

        const sub = await this.subscriptionRepository.findOneByCustomerId(stripeCustomerId);
        if (sub?.user?.userId) {
          await this.userRepository.update(sub.user.userId, { plan: SubscriptionPlan.FREE });
        }
        break;
      }
      default:
        break;
    }
  }

  // ─── Resolve Plan From Price ID ────────────────────────────────────────────

  private resolvePlanFromPriceId(priceId: string): SubscriptionPlan | null {
    const map: Record<string, SubscriptionPlan> = {
      [this.configService.get<string>('STRIPE_ARTIST_PRO_PRICE_MONTHLY') as string]:
        SubscriptionPlan.PRO_MONTHLY,
      [this.configService.get<string>('STRIPE_ARTIST_PRO_PRICE_YEARLY') as string]:
        SubscriptionPlan.PRO_YEARLY,
      [this.configService.get<string>('STRIPE_GO_PLUS_PRICE_MONTHLY') as string]:
        SubscriptionPlan.GO_PLUS_MONTHLY,
      [this.configService.get<string>('STRIPE_GO_PLUS_PRICE_YEARLY') as string]:
        SubscriptionPlan.GO_PLUS_YEARLY,
    };

    return map[priceId] ?? null;
  }
}
