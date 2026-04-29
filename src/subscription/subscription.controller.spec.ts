import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { PlanType, BillingCycle } from './dto/createCheckOutSessionDto';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_PAYMENT_METHOD_ID = 'pm_test_card';

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let subscriptionService: SubscriptionService;

  const mockSubscriptionService = {
    createCheckout: jest.fn(),
    getMySubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── createCheckout ────────────────────────────────────────────────────────

  describe('createCheckout', () => {
    const dto = {
      plan: PlanType.PRO,
      billingCycle: BillingCycle.MONTHLY,
      paymentMethodId: MOCK_PAYMENT_METHOD_ID,
    };

    it('should call subscriptionService.createCheckout with correct arguments', async () => {
      const mockResult = { status: 'success', message: 'Subscription created successfully' };
      mockSubscriptionService.createCheckout.mockResolvedValue(mockResult);

      await controller.createCheckout(MOCK_USER_ID, dto as any);

      expect(subscriptionService.createCheckout).toHaveBeenCalledTimes(1);
      expect(subscriptionService.createCheckout).toHaveBeenCalledWith(
        MOCK_USER_ID,
        dto.plan,
        dto.billingCycle,
        dto.paymentMethodId
      );
    });

    it('should return the service result as-is on success', async () => {
      const mockResult = { status: 'success', message: 'Subscription created successfully' };
      mockSubscriptionService.createCheckout.mockResolvedValue(mockResult);

      const result = await controller.createCheckout(MOCK_USER_ID, dto as any);

      expect(result).toEqual(mockResult);
    });

    it('should return pending status when payment is being processed', async () => {
      const mockResult = { status: 'pending', message: 'Payment is being processed' };
      mockSubscriptionService.createCheckout.mockResolvedValue(mockResult);

      const result = await controller.createCheckout(MOCK_USER_ID, dto as any);

      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException from service', async () => {
      mockSubscriptionService.createCheckout.mockRejectedValue(
        new BadRequestException('User already has an active subscription')
      );

      await expect(controller.createCheckout(MOCK_USER_ID, dto as any)).rejects.toThrow(
        new BadRequestException('User already has an active subscription')
      );
    });
  });

  // ─── getMySubscription ─────────────────────────────────────────────────────

  describe('getMySubscription', () => {
    it('should call subscriptionService.getMySubscription with the user ID', async () => {
      const mockResult = {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
      };
      mockSubscriptionService.getMySubscription.mockResolvedValue(mockResult);

      await controller.getMySubscription(MOCK_USER_ID);

      expect(subscriptionService.getMySubscription).toHaveBeenCalledTimes(1);
      expect(subscriptionService.getMySubscription).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return default FREE plan response when user has no subscription', async () => {
      const mockResult = {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
      };
      mockSubscriptionService.getMySubscription.mockResolvedValue(mockResult);

      const result = await controller.getMySubscription(MOCK_USER_ID);

      expect(result).toEqual(mockResult);
    });

    it('should return subscription data for a paid plan', async () => {
      const mockResult = {
        plan: SubscriptionPlan.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: 'monthly',
        currentPeriodEnd: new Date('2026-05-30T00:00:00Z'),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_test5678',
      };
      mockSubscriptionService.getMySubscription.mockResolvedValue(mockResult);

      const result = await controller.getMySubscription(MOCK_USER_ID);

      expect(result).toEqual(mockResult);
    });
  });

  // ─── cancelSubscription ────────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should call subscriptionService.cancelSubscription with the user ID', async () => {
      const mockResult = { message: 'Your subscription will remain active until Sat May 30 2026' };
      mockSubscriptionService.cancelSubscription.mockResolvedValue(mockResult);

      await controller.cancelSubscription(MOCK_USER_ID);

      expect(subscriptionService.cancelSubscription).toHaveBeenCalledTimes(1);
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return the message from the service', async () => {
      const mockResult = { message: 'Your subscription will remain active until Sat May 30 2026' };
      mockSubscriptionService.cancelSubscription.mockResolvedValue(mockResult);

      const result = await controller.cancelSubscription(MOCK_USER_ID);

      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException when no active subscription', async () => {
      mockSubscriptionService.cancelSubscription.mockRejectedValue(
        new BadRequestException('No active subscription to cancel')
      );

      await expect(controller.cancelSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('No active subscription to cancel')
      );
    });

    it('should propagate BadRequestException when already scheduled for cancellation', async () => {
      mockSubscriptionService.cancelSubscription.mockRejectedValue(
        new BadRequestException('Subscription is already scheduled for cancellation')
      );

      await expect(controller.cancelSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('Subscription is already scheduled for cancellation')
      );
    });
  });

  // ─── resumeSubscription ────────────────────────────────────────────────────

  describe('resumeSubscription', () => {
    it('should call subscriptionService.resumeSubscription with the user ID', async () => {
      const mockResult = { message: 'Subscription resumed successfully' };
      mockSubscriptionService.resumeSubscription.mockResolvedValue(mockResult);

      await controller.resumeSubscription(MOCK_USER_ID);

      expect(subscriptionService.resumeSubscription).toHaveBeenCalledTimes(1);
      expect(subscriptionService.resumeSubscription).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return the success message from the service', async () => {
      const mockResult = { message: 'Subscription resumed successfully' };
      mockSubscriptionService.resumeSubscription.mockResolvedValue(mockResult);

      const result = await controller.resumeSubscription(MOCK_USER_ID);

      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException when subscription is not scheduled for cancellation', async () => {
      mockSubscriptionService.resumeSubscription.mockRejectedValue(
        new BadRequestException('Subscription is not scheduled for cancellation')
      );

      await expect(controller.resumeSubscription(MOCK_USER_ID)).rejects.toThrow(
        new BadRequestException('Subscription is not scheduled for cancellation')
      );
    });
  });
});
