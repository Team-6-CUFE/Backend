import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import {
  mockAuthenticationService,
  mockRegisterDto,
  mockLoginDto,
  mockLoginDtoWithUsername,
  mockUserId,
  mockEmail,
  mockVerificationToken,
  mockRefreshToken,
  mockResponseWithCookie,
  mockRequest,
  mockSecondaryEmail,
  mockVerificationCode,
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

  describe('login', () => {
    it('should delegate to service with loginDto and response', async () => {
      const dto = mockLoginDto();
      const res = mockResponseWithCookie();
      service.login.mockResolvedValue({ status: 'success', message: 'Login successful', data: {} });

      await controller.login(dto as any, res as any);

      expect(service.login).toHaveBeenCalledWith(dto, res);
      expect(service.login).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Login successful',
        data: { user_id: mockUserId, email: mockEmail },
      };
      service.login.mockResolvedValue(mockServiceResponse);

      const result = await controller.login(mockLoginDto() as any, mockResponseWithCookie() as any);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should work with username identifier', async () => {
      const dto = mockLoginDtoWithUsername();
      service.login.mockResolvedValue({ status: 'success', message: 'Login successful', data: {} });

      await controller.login(dto as any, mockResponseWithCookie() as any);

      expect(service.login).toHaveBeenCalledWith(dto, expect.anything());
    });

    it('should propagate exception thrown by service', async () => {
      service.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login(mockLoginDto() as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should extract refresh_token from cookies and pass to service', async () => {
      const req = mockRequest(mockRefreshToken);
      const res = mockResponseWithCookie();
      service.logout.mockResolvedValue({ status: 'success', message: 'Logged out successfully' });

      await controller.logout(req as any, res as any);

      expect(service.logout).toHaveBeenCalledWith(res, mockRefreshToken);
      expect(service.logout).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = { status: 'success', message: 'Logged out successfully' };
      service.logout.mockResolvedValue(mockServiceResponse);

      const result = await controller.logout(mockRequest() as any, mockResponseWithCookie() as any);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should pass undefined if no refresh_token cookie is present', async () => {
      const req = { cookies: {} }; // no refresh_token key
      const res = mockResponseWithCookie();
      service.logout.mockResolvedValue({ status: 'success', message: 'Logged out successfully' });

      await controller.logout(req as any, res as any);

      expect(service.logout).toHaveBeenCalledWith(res, undefined);
    });

    it('should propagate exception thrown by service', async () => {
      service.logout.mockRejectedValue(new Error('Logout failed'));

      await expect(
        controller.logout(mockRequest() as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('Logout failed');
    });
  });

  describe('refresh', () => {
    const mockJwtUser = {
      sub: mockUserId,
      email: mockEmail,
      role: 'listener' as const,
      plan: 'free' as const,
      refreshToken: mockRefreshToken,
    };

    it('should delegate to service with all fields from jwt user', async () => {
      const res = mockResponseWithCookie();
      service.refreshTokens.mockResolvedValue({
        status: 'success',
        message: 'Token refreshed successfully',
      });

      await controller.refresh(mockJwtUser as any, res as any);

      expect(service.refreshTokens).toHaveBeenCalledWith(
        mockUserId,
        mockEmail,
        'listener',
        'free',
        mockRefreshToken,
        res
      );
      expect(service.refreshTokens).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = { status: 'success', message: 'Token refreshed successfully' };
      service.refreshTokens.mockResolvedValue(mockServiceResponse);

      const result = await controller.refresh(mockJwtUser as any, mockResponseWithCookie() as any);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.refreshTokens.mockRejectedValue(new Error('Token revoked'));

      await expect(
        controller.refresh(mockJwtUser as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('Token revoked');
    });
  });

  describe('remove', () => {
    it('should extract userId from jwt and refresh_token from cookies then delegate to service', async () => {
      const req = mockRequest(mockRefreshToken);
      const res = mockResponseWithCookie();
      service.removeUser.mockResolvedValue({
        status: 'success',
        message: 'Your account has been deleted successfully.',
      });

      await controller.remove(mockUserId, req as any, res as any);

      expect(service.removeUser).toHaveBeenCalledWith(mockUserId, res, mockRefreshToken);
      expect(service.removeUser).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Your account has been deleted successfully.',
      };
      service.removeUser.mockResolvedValue(mockServiceResponse);

      const result = await controller.remove(
        mockUserId,
        mockRequest() as any,
        mockResponseWithCookie() as any
      );

      expect(result).toEqual(mockServiceResponse);
    });

    it('should pass undefined refresh token if cookie is absent', async () => {
      const req = { cookies: {} };
      const res = mockResponseWithCookie();
      service.removeUser.mockResolvedValue({ status: 'success', message: '' });

      await controller.remove(mockUserId, req as any, res as any);

      expect(service.removeUser).toHaveBeenCalledWith(mockUserId, res, undefined);
    });

    it('should propagate exception thrown by service', async () => {
      service.removeUser.mockRejectedValue(new Error('Delete failed'));

      await expect(
        controller.remove(mockUserId, mockRequest() as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('Delete failed');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // ─── addEmail ────────────────────────────────────────────────────────────────

  describe('addEmail', () => {
    it('should delegate to service with userId and email', async () => {
      const dto = { email: mockSecondaryEmail };
      service.addEmail.mockResolvedValue({ status: 'success', message: 'Email added', data: {} });

      await controller.addEmail(mockUserId, dto as any);

      expect(service.addEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(service.addEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = { status: 'success', message: 'Email added', data: {} };
      service.addEmail.mockResolvedValue(mockServiceResponse);

      const result = await controller.addEmail(mockUserId, { email: mockSecondaryEmail } as any);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.addEmail.mockRejectedValue(new BadRequestException('Email already exists'));

      await expect(
        controller.addEmail(mockUserId, { email: mockSecondaryEmail } as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── removeEmail ─────────────────────────────────────────────────────────────

  describe('removeEmail', () => {
    it('should delegate to service with userId and email param', async () => {
      service.removeEmail.mockResolvedValue({ status: 'success', message: 'Email removed' });

      await controller.removeEmail(mockUserId, mockSecondaryEmail);

      expect(service.removeEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(service.removeEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = { status: 'success', message: 'Email removed successfully' };
      service.removeEmail.mockResolvedValue(mockServiceResponse);

      const result = await controller.removeEmail(mockUserId, mockSecondaryEmail);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.removeEmail.mockRejectedValue(new BadRequestException('Cannot delete primary email'));

      await expect(controller.removeEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── getEmails ────────────────────────────────────────────────────────────────

  describe('getEmails', () => {
    it('should delegate to service with userId from jwt', async () => {
      service.getEmails.mockResolvedValue({ status: 'success', emails: [] });

      await controller.getEmails(mockUserId);

      expect(service.getEmails).toHaveBeenCalledWith(mockUserId);
      expect(service.getEmails).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        emails: [{ email: mockEmail, is_primary: true, is_verified: true }],
      };
      service.getEmails.mockResolvedValue(mockServiceResponse);

      const result = await controller.getEmails(mockUserId);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.getEmails.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getEmails(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── setPrimaryEmail ──────────────────────────────────────────────────────────

  describe('setPrimaryEmail', () => {
    it('should delegate to service with userId and email param', async () => {
      service.setPrimaryEmail.mockResolvedValue({
        status: 'success',
        message: 'Verification code sent',
        data: {},
      });

      await controller.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(service.setPrimaryEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(service.setPrimaryEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Verification code sent to your current primary email.',
        data: {
          verification_required: true,
          code_sent_to: mockEmail,
          new_primary_email: mockSecondaryEmail,
          expires_in: 600,
        },
      };
      service.setPrimaryEmail.mockResolvedValue(mockServiceResponse);

      const result = await controller.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.setPrimaryEmail.mockRejectedValue(
        new BadRequestException('Email is already primary')
      );

      await expect(controller.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── verifyPrimaryEmailChange ─────────────────────────────────────────────────

  describe('verifyPrimaryEmailChange', () => {
    it('should delegate to service with userId and code from body', async () => {
      service.verifyPrimaryEmailChange.mockResolvedValue({
        status: 'success',
        message: 'Primary email changed successfully',
        data: {},
      });

      await controller.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(service.verifyPrimaryEmailChange).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationCode
      );
      expect(service.verifyPrimaryEmailChange).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Primary email changed successfully',
        data: { new_primary: mockSecondaryEmail },
      };
      service.verifyPrimaryEmailChange.mockResolvedValue(mockServiceResponse);

      const result = await controller.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.verifyPrimaryEmailChange.mockRejectedValue(
        new BadRequestException('Invalid or expired verification code')
      );

      await expect(
        controller.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow(BadRequestException);
    });
  });
  // ──────────────────────────────────────────────────────────────────────────────
});
