import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { StripeService } from './stripe.service';
import { UserRepository } from '../user/user.repository';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    findByStripeCustomerId: jest.fn(),
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
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
