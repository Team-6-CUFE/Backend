import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';

describe('WebhookController', () => {
  let controller: WebhookController;

  const mockSubscriptionService = {
    handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockStripeService = {
    constructWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── handleStripeWebhook ──────────────────────────────────────────────────────

  describe('handleStripeWebhook', () => {
    const makeReq = (rawBody?: Buffer) => ({ rawBody }) as any;
    const SIGNATURE = 'whsec_test_signature';
    const RAW_BODY = Buffer.from('{"type":"payment_intent.succeeded"}');

    it('should throw BadRequestException when signature is missing', async () => {
      await expect(
        controller.handleStripeWebhook(makeReq(RAW_BODY), undefined as any)
      ).rejects.toThrow(new BadRequestException('Missing stripe signature'));
    });

    it('should throw BadRequestException when signature is an empty string', async () => {
      await expect(controller.handleStripeWebhook(makeReq(RAW_BODY), '')).rejects.toThrow(
        new BadRequestException('Missing stripe signature')
      );
    });

    it('should throw BadRequestException when req.rawBody is missing', async () => {
      await expect(controller.handleStripeWebhook(makeReq(undefined), SIGNATURE)).rejects.toThrow(
        new BadRequestException('Missing raw body')
      );
    });

    it('should throw BadRequestException when constructWebhookEvent throws', async () => {
      mockStripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(controller.handleStripeWebhook(makeReq(RAW_BODY), SIGNATURE)).rejects.toThrow(
        new BadRequestException('Webhook signature verification failed')
      );
    });

    it('should return { received: true } and call handleWebhookEvent on success', async () => {
      const fakeEvent = { type: 'payment_intent.succeeded', data: {} };
      mockStripeService.constructWebhookEvent.mockReturnValue(fakeEvent);

      const result = await controller.handleStripeWebhook(makeReq(RAW_BODY), SIGNATURE);

      expect(result).toEqual({ received: true });
      expect(mockStripeService.constructWebhookEvent).toHaveBeenCalledWith(RAW_BODY, SIGNATURE);
      expect(mockSubscriptionService.handleWebhookEvent).toHaveBeenCalledWith(fakeEvent);
    });

    it('should call handleWebhookEvent with the constructed event object', async () => {
      const fakeEvent = { type: 'customer.subscription.deleted', data: { object: {} } };
      mockStripeService.constructWebhookEvent.mockReturnValue(fakeEvent);

      await controller.handleStripeWebhook(makeReq(RAW_BODY), SIGNATURE);

      expect(mockSubscriptionService.handleWebhookEvent).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionService.handleWebhookEvent).toHaveBeenCalledWith(fakeEvent);
    });
  });
});
