import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  // ─── Customer ─────────────────────────────────────────────────────────────

  async createCustomer(email: string, username: string, userId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name: username,
      metadata: { userId },
    });
  }

  async getCustomer(stripeCustomerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(stripeCustomerId);
  }

  // ─── Checkout Session ──────────────────────────────────────────────────────

  async createCheckoutSession(
    stripeCustomerId: string,
    priceId: string,
    userId: string
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `http://localhost:3000/subscription/success`,
      cancel_url: `http://localhost:3000/subscription/cancel`,
      metadata: { userId },
    });
  }

  // ─── Subscription ──────────────────────────────────────────────────────────

  async getSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async resumeSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
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
