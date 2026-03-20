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
  // ─── changePasswordRequest ────────────────────────────────────────────────────

  describe('changePasswordRequest', () => {
    it('should delegate to service with userId from JWT', async () => {
      service.changePasswordRequest.mockResolvedValue({
        status: 'success',
        message: 'Password reset link sent to your primary email address.',
        data: { email_sent: true, sent_to: mockEmail },
      });

      await controller.changePasswordRequest(mockUserId);

      expect(service.changePasswordRequest).toHaveBeenCalledWith(mockUserId);
      expect(service.changePasswordRequest).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Password reset link sent to your primary email address.',
        data: { email_sent: true, sent_to: mockEmail },
      };
      service.changePasswordRequest.mockResolvedValue(mockServiceResponse);

      const result = await controller.changePasswordRequest(mockUserId);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.changePasswordRequest.mockRejectedValue(
        new BadRequestException('No verified primary email found.')
      );

      await expect(controller.changePasswordRequest(mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    const mockChangePasswordDto = {
      token: mockVerificationToken,
      newPassword: 'NewSecurePassword123!',
    };

    it('should delegate to service with token and newPassword', async () => {
      service.changePassword.mockResolvedValue({
        status: 'success',
        message: 'Password has been changed successfully.',
        data: { password_changed: true, reset_at: new Date() },
      });

      await controller.changePassword(mockChangePasswordDto as any);

      expect(service.changePassword).toHaveBeenCalledWith(
        mockChangePasswordDto.token,
        mockChangePasswordDto.newPassword
      );
      expect(service.changePassword).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Password has been changed successfully.',
        data: { password_changed: true, reset_at: new Date() },
      };
      service.changePassword.mockResolvedValue(mockServiceResponse);

      const result = await controller.changePassword(mockChangePasswordDto as any);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception if token is invalid', async () => {
      service.changePassword.mockRejectedValue(
        new BadRequestException('Invalid or expired password reset token.')
      );

      await expect(controller.changePassword(mockChangePasswordDto as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate exception if same password', async () => {
      service.changePassword.mockRejectedValue(
        new BadRequestException('New password must be different from current password.')
      );

      await expect(controller.changePassword(mockChangePasswordDto as any)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should delegate to service with email', async () => {
      service.forgotPassword.mockResolvedValue({
        status: 'success',
        message: 'Password reset link sent.',
        data: { email_sent: true, sent_to: mockEmail },
      });

      await controller.forgotPassword(mockEmail);

      expect(service.forgotPassword).toHaveBeenCalledWith(mockEmail);
      expect(service.forgotPassword).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Password reset link sent.',
        data: { email_sent: true, sent_to: mockEmail },
      };
      service.forgotPassword.mockResolvedValue(mockServiceResponse);

      const result = await controller.forgotPassword(mockEmail);

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception if email not found', async () => {
      service.forgotPassword.mockRejectedValue(new NotFoundException('No verified account found.'));

      await expect(controller.forgotPassword(mockEmail)).rejects.toThrow(NotFoundException);
    });

    it('should propagate exception if email not verified', async () => {
      service.forgotPassword.mockRejectedValue(new NotFoundException('No verified account found.'));

      await expect(controller.forgotPassword(mockEmail)).rejects.toThrow(NotFoundException);
    });
  });
});
