import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import {
  mockAuthenticationService,
  mockRegisterDto,
  mockEmail,
  mockVerificationToken,
} from './test/auth.mock';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let service: ReturnType<typeof mockAuthenticationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [{ provide: AuthenticationService, useFactory: mockAuthenticationService }],
    }).compile();

    controller = module.get(AuthenticationController);
    service = module.get(AuthenticationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should delegate to service with registerDto', async () => {
      const dto = mockRegisterDto();
      service.register.mockResolvedValue({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {},
      });

      await controller.register(dto as any);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(service.register).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: { email: mockEmail },
      };
      service.register.mockResolvedValue(mockResponse);

      const result = await controller.register(mockRegisterDto() as any);

      expect(result).toEqual(mockResponse);
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────────────────

  describe('verifyemail', () => {
    it('should delegate to service with token param', async () => {
      service.verifyEmail.mockResolvedValue({
        status: 'success',
        message: 'Email verified successfully.',
      });

      await controller.verifyemail(mockVerificationToken);

      expect(service.verifyEmail).toHaveBeenCalledWith(mockVerificationToken);
      expect(service.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Email verified successfully.',
      };
      service.verifyEmail.mockResolvedValue(mockResponse);

      const result = await controller.verifyemail(mockVerificationToken);

      expect(result).toEqual(mockResponse);
    });
  });

  // ─── resendVerificationEmail ──────────────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('should delegate to service with email', async () => {
      service.resendVerificationEmail.mockResolvedValue({
        status: 'success',
        message: 'Verification email resent. Please check your email.',
      });

      await controller.resendVerificationEmail(mockEmail);

      expect(service.resendVerificationEmail).toHaveBeenCalledWith(mockEmail);
      expect(service.resendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Verification email resent. Please check your email.',
      };
      service.resendVerificationEmail.mockResolvedValue(mockResponse);

      const result = await controller.resendVerificationEmail(mockEmail);

      expect(result).toEqual(mockResponse);
    });
  });
});
