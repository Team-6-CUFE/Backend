import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

// ─── Create Checkout ──────────────────────────────────────────────────────────

export function ApiCreateCheckout() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Create a subscription checkout',
      description:
        'Attaches a Stripe payment method to the user and creates a new paid subscription. ' +
        'The user must not already have an active paid subscription. ' +
        'Returns `status: "success"` when payment is immediately confirmed, ' +
        'or `status: "pending"` while Stripe is still processing.',
    }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        required: ['plan', 'billingCycle', 'paymentMethodId'],
        properties: {
          plan: {
            type: 'string',
            enum: ['pro', 'go+'],
            description: 'The plan to subscribe to',
            example: 'pro',
          },
          billingCycle: {
            type: 'string',
            enum: ['monthly', 'yearly'],
            description: 'Billing interval',
            example: 'monthly',
          },
          paymentMethodId: {
            type: 'string',
            description: 'Stripe payment method ID (e.g. pm_xxx)',
            example: 'pm_1OqHBx2eZvKYlo2C0123abcd',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Subscription created — payment confirmed immediately.',
      schema: {
        example: {
          status: 'success',
          message: 'Subscription created successfully',
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Subscription created — payment still being processed by Stripe.',
      schema: {
        example: {
          status: 'pending',
          message: 'Payment is being processed',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad request — user already has an active subscription, card was declined, or user account not found.',
      schema: {
        example: {
          statusCode: 400,
          message: 'User already has an active subscription',
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get My Subscription ──────────────────────────────────────────────────────

export function ApiGetMySubscription() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get current user subscription',
      description:
        "Returns the authenticated user's current subscription state. " +
        'If no subscription record exists in the database, a default FREE / active ' +
        'response is returned (no 404).',
    }),
    ApiResponse({
      status: 200,
      description: 'Active paid subscription.',
      schema: {
        example: {
          plan: 'pro_monthly',
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-05-30T00:00:00.000Z',
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: 'sub_1OqHBx2eZvKYlo2C0123abcd',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'No subscription record — user is on the free plan.',
      schema: {
        example: {
          plan: 'free',
          status: 'active',
          billingCycle: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export function ApiCancelSubscription() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Cancel subscription at period end',
      description:
        'Marks the active subscription to cancel at the end of the current billing period. ' +
        'The subscription remains accessible until `currentPeriodEnd`. ' +
        'Throws if the user has no active paid subscription or if cancellation is already scheduled.',
    }),
    ApiResponse({
      status: 200,
      description: 'Cancellation scheduled successfully.',
      schema: {
        example: {
          message: 'Your subscription will remain active until Thu May 30 2026',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad request — no active paid subscription to cancel, or already scheduled for cancellation.',
      schema: {
        example: {
          statusCode: 400,
          message: 'No active subscription to cancel',
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Resume Subscription ──────────────────────────────────────────────────────

export function ApiResumeSubscription() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Resume a cancelled subscription',
      description:
        'Reverses a pending cancellation on the current subscription so it renews normally ' +
        'at the end of the billing period. ' +
        'Throws if the subscription is not currently scheduled for cancellation.',
    }),
    ApiResponse({
      status: 200,
      description: 'Subscription resumed successfully.',
      schema: {
        example: {
          message: 'Subscription resumed successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Subscription is not scheduled for cancellation.',
      schema: {
        example: {
          statusCode: 400,
          message: 'Subscription is not scheduled for cancellation',
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
