import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
  mockOAuthProfile,
  mockPendingToken,
  mockCompleteOAuthProfileDto,
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

  // ─── googleCallback ───────────────────────────────────────────────────────────

  describe('googleCallback', () => {
    it('should delegate to handleOAuthCallback with profile and response', async () => {
      const profile = mockOAuthProfile();
      const res = mockResponseWithCookie();
      service.handleOAuthCallback.mockResolvedValue({
        status: 'success',
        type: 'login',
        data: {},
      });

      await controller.googleCallback(profile as any, res as any);

      expect(service.handleOAuthCallback).toHaveBeenCalledWith(profile, res);
      expect(service.handleOAuthCallback).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        type: 'registration_incomplete',
        data: { pending_token: mockPendingToken, prefill: {} },
      };
      service.handleOAuthCallback.mockResolvedValue(mockServiceResponse);

      const result = await controller.googleCallback(
        mockOAuthProfile() as any,
        mockResponseWithCookie() as any
      );

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.handleOAuthCallback.mockRejectedValue(new Error('OAuth error'));

      await expect(
        controller.googleCallback(mockOAuthProfile() as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('OAuth error');
    });
  });

  // ─── completeOAuthProfile ─────────────────────────────────────────────────────

  describe('completeOAuthProfile', () => {
    it('should delegate to service with dto and response', async () => {
      const dto = mockCompleteOAuthProfileDto();
      const res = mockResponseWithCookie();
      service.completeOAuthProfile.mockResolvedValue({
        status: 'success',
        message: 'Profile completed and logged in successfully',
        data: {},
      });

      await controller.completeOAuth(dto as any, res as any);

      expect(service.completeOAuthProfile).toHaveBeenCalledWith(dto, res);
      expect(service.completeOAuthProfile).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        message: 'Profile completed and logged in successfully',
        data: { user_id: mockUserId },
      };
      service.completeOAuthProfile.mockResolvedValue(mockServiceResponse);

      const result = await controller.completeOAuth(
        mockCompleteOAuthProfileDto() as any,
        mockResponseWithCookie() as any
      );

      expect(result).toEqual(mockServiceResponse);
    });

    it('should propagate exception thrown by service', async () => {
      service.completeOAuthProfile.mockRejectedValue(new NotFoundException('Invalid token'));

      await expect(
        controller.completeOAuth(
          mockCompleteOAuthProfileDto() as any,
          mockResponseWithCookie() as any
        )
      ).rejects.toThrow(NotFoundException);
    });
  });
  // ─── facebookCallback ─────────────────────────────────────────────────────────

  describe('facebookCallback', () => {
    it('should delegate to handleOAuthCallback with profile and response', async () => {
      const profile = mockOAuthProfile();
      const res = mockResponseWithCookie();
      service.handleOAuthCallback.mockResolvedValue({
        status: 'success',
        type: 'login',
        data: {},
      });

      await controller.facebookCallback(profile as any, res as any);

      expect(service.handleOAuthCallback).toHaveBeenCalledWith(profile, res);
      expect(service.handleOAuthCallback).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as is', async () => {
      const mockServiceResponse = {
        status: 'success',
        type: 'registration_incomplete',
        data: { pending_token: mockPendingToken, prefill: {} },
      };
      service.handleOAuthCallback.mockResolvedValue(mockServiceResponse);

      const result = await controller.facebookCallback(
        mockOAuthProfile() as any,
        mockResponseWithCookie() as any
      );

      expect(result).toEqual(mockServiceResponse);
    });

    it('should return login type when user already exists', async () => {
      service.handleOAuthCallback.mockResolvedValue({
        status: 'success',
        type: 'login',
        data: { user_id: mockUserId, email: mockEmail },
      });

      const result = await controller.facebookCallback(
        mockOAuthProfile() as any,
        mockResponseWithCookie() as any
      );

      expect(result.type).toBe('login');
    });

    it('should return registration_incomplete type for new user', async () => {
      service.handleOAuthCallback.mockResolvedValue({
        status: 'success',
        type: 'registration_incomplete',
        data: {
          pending_token: mockPendingToken,
          prefill: { display_name: 'John Doe', email: mockEmail },
        },
      });

      const result = await controller.facebookCallback(
        mockOAuthProfile() as any,
        mockResponseWithCookie() as any
      );

      expect(result.type).toBe('registration_incomplete');
      // ← use type assertion to tell TypeScript which type it is
      const data = result.data as { pending_token: string; prefill: object };
      expect(data.pending_token).toBe(mockPendingToken);
    });

    it('should propagate exception thrown by service', async () => {
      service.handleOAuthCallback.mockRejectedValue(new Error('OAuth error'));

      await expect(
        controller.facebookCallback(mockOAuthProfile() as any, mockResponseWithCookie() as any)
      ).rejects.toThrow('OAuth error');
    });
  });
});
