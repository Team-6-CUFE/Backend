import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

// ─── Stripe mock ──────────────────────────────────────────────────────────────

const mockStripeInstance = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  paymentMethods: {
    create: jest.fn(),
    attach: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripeInstance));

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('StripeService', () => {
  let service: StripeService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_secret',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createCustomer ───────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    it('should call stripe.customers.create with email, username and userId', async () => {
      const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer('test@example.com', 'testuser', 'user-uuid-1');

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'testuser',
        metadata: { userId: 'user-uuid-1' },
      });
      expect(result).toBe(mockCustomer);
    });
  });

  // ─── getCustomer ─────────────────────────────────────────────────────────────

  describe('getCustomer', () => {
    it('should call stripe.customers.retrieve with the customer id', async () => {
      const mockCustomer = { id: 'cus_123' };
      mockStripeInstance.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await service.getCustomer('cus_123');

      expect(mockStripeInstance.customers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(result).toBe(mockCustomer);
    });
  });

  // ─── attachPaymentMethod ─────────────────────────────────────────────────────

  describe('attachPaymentMethod', () => {
    it('should call attach and customers.update without creating a new PM for a regular payment method', async () => {
      mockStripeInstance.paymentMethods.attach.mockResolvedValue({});
      mockStripeInstance.customers.update.mockResolvedValue({});

      await service.attachPaymentMethod('pm_real_method', 'cus_123');

      expect(mockStripeInstance.paymentMethods.create).not.toHaveBeenCalled();
      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith('pm_real_method', {
        customer: 'cus_123',
      });
      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith('cus_123', {
        invoice_settings: { default_payment_method: 'pm_real_method' },
      });
    });

    it('should create a new PM first when paymentMethodId starts with pm_card_', async () => {
      const newPm = { id: 'pm_generated_id' };
      mockStripeInstance.paymentMethods.create.mockResolvedValue(newPm);
      mockStripeInstance.paymentMethods.attach.mockResolvedValue({});
      mockStripeInstance.customers.update.mockResolvedValue({});

      await service.attachPaymentMethod('pm_card_visa', 'cus_123');

      expect(mockStripeInstance.paymentMethods.create).toHaveBeenCalledWith({
        type: 'card',
        card: { token: 'tok_visa' },
      });
      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith('pm_generated_id', {
        customer: 'cus_123',
      });
      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith('cus_123', {
        invoice_settings: { default_payment_method: 'pm_generated_id' },
      });
    });
  });

  // ─── createStripeSubscription ─────────────────────────────────────────────────

  describe('createStripeSubscription', () => {
    it('should call stripe.subscriptions.create with correct params', async () => {
      const mockSub = { id: 'sub_123', status: 'active' };
      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSub);

      const result = await service.createStripeSubscription('cus_123', 'price_456');

      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_456' }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result).toBe(mockSub);
    });
  });

  // ─── getSubscription ──────────────────────────────────────────────────────────

  describe('getSubscription', () => {
    it('should call stripe.subscriptions.retrieve with the subscription id', async () => {
      const mockSub = { id: 'sub_123' };
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSub);

      const result = await service.getSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
      expect(result).toBe(mockSub);
    });
  });

  // ─── cancelSubscription ───────────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should call stripe.subscriptions.update with cancel_at_period_end: true', async () => {
      const mockSub = { id: 'sub_123', cancel_at_period_end: true };
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSub);

      const result = await service.cancelSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
      expect(result).toBe(mockSub);
    });
  });

  // ─── resumeSubscription ───────────────────────────────────────────────────────

  describe('resumeSubscription', () => {
    it('should call stripe.subscriptions.update with cancel_at_period_end: false', async () => {
      const mockSub = { id: 'sub_123', cancel_at_period_end: false };
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSub);

      const result = await service.resumeSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false,
      });
      expect(result).toBe(mockSub);
    });
  });

  // ─── constructWebhookEvent ────────────────────────────────────────────────────

  describe('constructWebhookEvent', () => {
    it('should call stripe.webhooks.constructEvent with payload, signature and webhook secret', () => {
      const payload = Buffer.from('raw_body');
      const signature = 'whsec_sig';
      const fakeEvent = { type: 'payment_intent.succeeded' };
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(fakeEvent);

      const result = service.constructWebhookEvent(payload, signature);

      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_secret'
      );
      expect(result).toBe(fakeEvent);
    });
  });
});
