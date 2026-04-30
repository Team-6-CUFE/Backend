import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { StripeService } from './stripe.service';
import { UserRepository } from '../user/user.repository';
import { SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { PlanType, BillingCycle } from './dto/createCheckOutSessionDto';

// ─── UUIDs ────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_STRIPE_CUSTOMER_ID = 'cus_test1234';
const MOCK_STRIPE_SUBSCRIPTION_ID = 'sub_test5678';
const MOCK_PRICE_ID_PRO_MONTHLY = 'price_pro_monthly';
const MOCK_PAYMENT_METHOD_ID = 'pm_test_card';

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockSubscription = (overrides?: object) => ({
  subscriptionId: 'sub-uuid-1',
  stripeCustomerId: MOCK_STRIPE_CUSTOMER_ID,
  stripeSubscriptionId: MOCK_STRIPE_SUBSCRIPTION_ID,
  plan: SubscriptionPlan.FREE,
  status: SubscriptionStatus.ACTIVE,
  currentPeriodStart: null,
  currentPeriodEnd: new Date('2026-05-30T00:00:00Z'),
  cancelAtPeriodEnd: false,
  user: { userId: MOCK_USER_ID },
  ...overrides,
});

const mockUser = (overrides?: object) => ({
  userId: MOCK_USER_ID,
  username: 'dj_nour',
  emails: [{ email: 'dj@harmonica.com', isPrimary: true }],
  ...overrides,
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findOneByCustomerId: jest.fn(),
  };

  const mockStripeService = {
    createCustomer: jest.fn(),
    attachPaymentMethod: jest.fn(),
    createStripeSubscription: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const mockUserRepository = {
    findUserWithEmails: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        STRIPE_ARTIST_PRO_PRICE_MONTHLY: MOCK_PRICE_ID_PRO_MONTHLY,
        STRIPE_ARTIST_PRO_PRICE_YEARLY: 'price_pro_yearly',
        STRIPE_GO_PLUS_PRICE_MONTHLY: 'price_go_plus_monthly',
        STRIPE_GO_PLUS_PRICE_YEARLY: 'price_go_plus_yearly',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: SubscriptionRepository, useValue: mockSubscriptionRepository },
        { provide: StripeService, useValue: mockStripeService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createCheckout ────────────────────────────────────────────────────────

  describe('createCheckout', () => {
    const makeStripeSubscription = (paymentStatus: string) => ({
      id: MOCK_STRIPE_SUBSCRIPTION_ID,
      latest_invoice: {
        payment_intent: { status: paymentStatus },
      },
    });

    it('should throw BadRequestException when user is not found and no subscription exists', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findUserWithEmails.mockResolvedValue(null);

      await expect(
        service.createCheckout(
          MOCK_USER_ID,
          PlanType.PRO,
          BillingCycle.MONTHLY,
          MOCK_PAYMENT_METHOD_ID
        )
      ).rejects.toThrow(new BadRequestException('user not found'));
    });

    it('should throw BadRequestException when user has no primary email', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findUserWithEmails.mockResolvedValue(
        mockUser({ emails: [{ email: 'secondary@test.com', isPrimary: false }] })
      );

      await expect(
        service.createCheckout(
          MOCK_USER_ID,
          PlanType.PRO,
          BillingCycle.MONTHLY,
          MOCK_PAYMENT_METHOD_ID
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already has an active paid subscription', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ plan: SubscriptionPlan.PRO_MONTHLY, status: SubscriptionStatus.ACTIVE })
      );

      await expect(
        service.createCheckout(
          MOCK_USER_ID,
          PlanType.PRO,
          BillingCycle.MONTHLY,
          MOCK_PAYMENT_METHOD_ID
        )
      ).rejects.toThrow(new BadRequestException('User already has an active subscription'));
    });

    it('should throw BadRequestException when card is declined', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('requires_payment_method')
      );

      await expect(
        service.createCheckout(
          MOCK_USER_ID,
          PlanType.PRO,
          BillingCycle.MONTHLY,
          MOCK_PAYMENT_METHOD_ID
        )
      ).rejects.toThrow(new BadRequestException('Your card was declined'));
    });

    it('should return success when payment intent status is succeeded', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('succeeded')
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.createCheckout(
        MOCK_USER_ID,
        PlanType.PRO,
        BillingCycle.MONTHLY,
        MOCK_PAYMENT_METHOD_ID
      );

      expect(result).toEqual({ status: 'success', message: 'Subscription created successfully' });
      expect(mockUserRepository.update).toHaveBeenCalledWith(MOCK_USER_ID, { plan: PlanType.PRO });
    });

    it('should return success when webhook updates DB to active while polling', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('processing')
      );
      mockUserRepository.update.mockResolvedValue(undefined);
      mockSubscriptionRepository.findOneByCustomerId.mockResolvedValue(
        mockSubscription({ status: SubscriptionStatus.ACTIVE, plan: SubscriptionPlan.PRO_MONTHLY })
      );

      const resultPromise = service.createCheckout(
        MOCK_USER_ID,
        PlanType.PRO,
        BillingCycle.MONTHLY,
        MOCK_PAYMENT_METHOD_ID
      );

      await jest.runAllTimersAsync();

      const result = await resultPromise;
      expect(result).toEqual({ status: 'success', message: 'Subscription created successfully' });
    });

    it('should throw BadRequestException when webhook signals payment failure', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('processing')
      );
      mockSubscriptionRepository.findOneByCustomerId.mockResolvedValue(
        mockSubscription({ status: SubscriptionStatus.PAST_DUE })
      );

      // ✅ capture the error via .catch() before timers run
      let caughtError: unknown;
      const resultPromise = service
        .createCheckout(MOCK_USER_ID, PlanType.PRO, BillingCycle.MONTHLY, MOCK_PAYMENT_METHOD_ID)
        .catch((err: unknown) => {
          caughtError = err;
        });

      await jest.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(BadRequestException);
      expect((caughtError as BadRequestException).message).toBe('Payment failed');
    });

    it('should throw BadRequestException when payment times out', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('processing')
      );
      // ✅ never return a terminal status — poll runs until timeout fires
      mockSubscriptionRepository.findOneByCustomerId.mockResolvedValue(null);

      let caughtError: unknown;
      const resultPromise = service
        .createCheckout(MOCK_USER_ID, PlanType.PRO, BillingCycle.MONTHLY, MOCK_PAYMENT_METHOD_ID)
        .catch((err: unknown) => {
          caughtError = err;
        });

      await jest.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeInstanceOf(BadRequestException);
      expect((caughtError as BadRequestException).message).toBe(
        'Payment timed out, please check your subscription status'
      );
    });

    it('should attach payment method to stripe customer before creating subscription', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('succeeded')
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.createCheckout(
        MOCK_USER_ID,
        PlanType.PRO,
        BillingCycle.MONTHLY,
        MOCK_PAYMENT_METHOD_ID
      );

      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith(
        MOCK_PAYMENT_METHOD_ID,
        MOCK_STRIPE_CUSTOMER_ID
      );
      expect(mockStripeService.createStripeSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_CUSTOMER_ID,
        MOCK_PRICE_ID_PRO_MONTHLY
      );
    });

    it('should create a stripe customer when no subscription exists yet', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findUserWithEmails.mockResolvedValue(mockUser());
      mockStripeService.createCustomer.mockResolvedValue({ id: MOCK_STRIPE_CUSTOMER_ID });
      mockSubscriptionRepository.createSubscription.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('succeeded')
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.createCheckout(
        MOCK_USER_ID,
        PlanType.PRO,
        BillingCycle.MONTHLY,
        MOCK_PAYMENT_METHOD_ID
      );

      expect(mockStripeService.createCustomer).toHaveBeenCalledWith(
        'dj@harmonica.com',
        'dj_nour',
        MOCK_USER_ID
      );
    });

    it('should use yearly price ID when billingCycle is yearly', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription());
      mockStripeService.attachPaymentMethod.mockResolvedValue(undefined);
      mockStripeService.createStripeSubscription.mockResolvedValue(
        makeStripeSubscription('succeeded')
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.createCheckout(
        MOCK_USER_ID,
        PlanType.PRO,
        BillingCycle.YEARLY,
        MOCK_PAYMENT_METHOD_ID
      );

      expect(mockStripeService.createStripeSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_CUSTOMER_ID,
        'price_pro_yearly'
      );
    });
  });

  // ─── getMySubscription ─────────────────────────────────────────────────────

  describe('getMySubscription', () => {
    it('should return default FREE plan when no subscription record exists', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result).toEqual({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
      });
    });

    it('should return subscription data when a record exists', async () => {
      const sub = mockSubscription({
        plan: SubscriptionPlan.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: MOCK_STRIPE_SUBSCRIPTION_ID,
      });
      mockSubscriptionRepository.findOne.mockResolvedValue(sub);

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result).toEqual({
        plan: SubscriptionPlan.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: 'monthly',
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: MOCK_STRIPE_SUBSCRIPTION_ID,
      });
    });

    it('should resolve billingCycle as "yearly" for yearly plans', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ plan: SubscriptionPlan.PRO_YEARLY })
      );

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result.billingCycle).toBe('yearly');
    });

    it('should resolve billingCycle as null for the FREE plan', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ plan: SubscriptionPlan.FREE })
      );

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result.billingCycle).toBeNull();
    });

    it('should return cancelAtPeriodEnd as true when set', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({
          plan: SubscriptionPlan.GO_PLUS_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: true,
        })
      );

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should return stripeSubscriptionId as null when field is not set', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ stripeSubscriptionId: null })
      );

      const result = await service.getMySubscription(MOCK_USER_ID);

      expect(result.stripeSubscriptionId).toBeNull();
    });
  });

  // ─── cancelSubscription ────────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should throw BadRequestException when user is not on a paid plan', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ plan: SubscriptionPlan.FREE, status: SubscriptionStatus.ACTIVE })
      );

      await expect(service.cancelSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('No active subscription to cancel')
      );
    });

    it('should throw BadRequestException when subscription is not active', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({
          plan: SubscriptionPlan.PRO_MONTHLY,
          status: SubscriptionStatus.PAST_DUE,
        })
      );

      await expect(service.cancelSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('No active subscription to cancel')
      );
    });

    it('should throw BadRequestException when already scheduled for cancellation', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({
          plan: SubscriptionPlan.PRO_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: true,
        })
      );

      await expect(service.cancelSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('Subscription is already scheduled for cancellation')
      );
    });

    it('should call stripe cancelSubscription and update the repository', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ plan: SubscriptionPlan.PRO_MONTHLY, status: SubscriptionStatus.ACTIVE })
      );
      mockStripeService.cancelSubscription.mockResolvedValue(undefined);
      mockSubscriptionRepository.updateSubscription.mockResolvedValue(undefined);

      await service.cancelSubscription(MOCK_USER_ID);

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_SUBSCRIPTION_ID
      );
      expect(mockSubscriptionRepository.updateSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_CUSTOMER_ID,
        { cancelAtPeriodEnd: true }
      );
    });

    it('should return a message containing the period end date', async () => {
      const periodEnd = new Date('2026-05-30T00:00:00Z');
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({
          plan: SubscriptionPlan.PRO_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: periodEnd,
        })
      );
      mockStripeService.cancelSubscription.mockResolvedValue(undefined);
      mockSubscriptionRepository.updateSubscription.mockResolvedValue(undefined);

      const result = await service.cancelSubscription(MOCK_USER_ID);

      expect(result.message).toContain(periodEnd.toDateString());
    });
  });

  // ─── resumeSubscription ────────────────────────────────────────────────────

  describe('resumeSubscription', () => {
    it('should throw BadRequestException when subscription is not scheduled for cancellation', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ cancelAtPeriodEnd: false })
      );

      await expect(service.resumeSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('Subscription is not scheduled for cancellation')
      );
    });

    it('should call stripe resumeSubscription and update the repository', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ cancelAtPeriodEnd: true })
      );
      mockStripeService.resumeSubscription.mockResolvedValue(undefined);
      mockSubscriptionRepository.updateSubscription.mockResolvedValue(undefined);

      await service.resumeSubscription(MOCK_USER_ID);

      expect(mockStripeService.resumeSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_SUBSCRIPTION_ID
      );
      expect(mockSubscriptionRepository.updateSubscription).toHaveBeenCalledWith(
        MOCK_STRIPE_CUSTOMER_ID,
        { cancelAtPeriodEnd: false }
      );
    });

    it('should return success message', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(
        mockSubscription({ cancelAtPeriodEnd: true })
      );
      mockStripeService.resumeSubscription.mockResolvedValue(undefined);
      mockSubscriptionRepository.updateSubscription.mockResolvedValue(undefined);

      const result = await service.resumeSubscription(MOCK_USER_ID);

      expect(result).toEqual({ message: 'Subscription resumed successfully' });
    });
  });
});
