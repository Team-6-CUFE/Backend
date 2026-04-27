import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe>;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // ─── Customer ─────────────────────────────────────────────────────────────

  async createCustomer(
    email: string,
    username: string,
    userId: string
  ): Promise<Stripe.Response<Stripe.Customer>> {
    return this.stripe.customers.create({
      email,
      name: username,
      metadata: { userId },
    });
  }

  async getCustomer(
    stripeCustomerId: string
  ): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    return this.stripe.customers.retrieve(stripeCustomerId);
  }

  // ─── Payment Method ────────────────────────────────────────────────────────

  async attachPaymentMethod(paymentMethodId: string, stripeCustomerId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // ─── Subscription ──────────────────────────────────────────────────────────

  async createStripeSubscription(
    stripeCustomerId: string,
    priceId: string
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    return this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async getSubscription(
    stripeSubscriptionId: string
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    return this.stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  async cancelSubscription(
    stripeSubscriptionId: string
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async resumeSubscription(
    stripeSubscriptionId: string
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') as string
    );
  }
}
