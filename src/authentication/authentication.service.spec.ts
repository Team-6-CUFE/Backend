import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repositry';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import * as captchaUtil from '../common/utilities/captcha.util';
import * as tokensUtil from '../common/utilities/tokens.util';
import {
  mockAuthenticationRepository,
  mockUserService,
  mockMailService,
  mockJwtService,
  mockConfigService,
  mockRegisterDto,
  mockUser,
  mockUserEmail,
  mockUserId,
  mockEmail,
  mockVerificationToken,
  mockUsername,
  mockAccessToken,
  mockRefreshToken,
  mockStoredRefreshToken,
  mockExpiredRefreshToken,
  mockLoginDto,
  mockLoginDtoWithUsername,
  mockResponseWithCookie,
  mockPendingToken,
  mockSocialAccount,
  mockOAuthProfile,
  mockProviderId,
  mockCompleteOAuthProfileDto,
  mockExpiredPendingOAuthSession,
  mockPendingOAuthSession,
} from './test/auth.mock';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let authRepo: ReturnType<typeof mockAuthenticationRepository>;
  let userService: ReturnType<typeof mockUserService>;
  let mailService: ReturnType<typeof mockMailService>;
  let jwtService: ReturnType<typeof mockJwtService>;
  let configService: ReturnType<typeof mockConfigService>; // ← add

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: AuthenticationRepository, useFactory: mockAuthenticationRepository },
        { provide: UserService, useFactory: mockUserService },
        { provide: MailService, useFactory: mockMailService },
        { provide: JwtService, useFactory: mockJwtService }, // ← one entry only
        { provide: ConfigService, useFactory: mockConfigService }, // ← one entry only
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService); // ← add
    authRepo = module.get(AuthenticationRepository);
    userService = module.get(UserService);
    mailService = module.get(MailService);
  });
  afterEach(() => jest.clearAllMocks());

  // ─── register() ──────────────────────────────────────────────────────────────

  describe('register', () => {
    beforeEach(() => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(true);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.checkEmailExists.mockResolvedValue(false);
      userService.checkUsernameExists.mockResolvedValue(false);
      userService.createUser.mockResolvedValue(mockUser());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
    });

    it('should register successfully and return correct response', async () => {
      const result = await service.register(mockRegisterDto() as any);

      expect(result.status).toBe('success');
      expect(result.data.email).toBe(mockEmail);
      expect(result.data.user_id).toBe(mockUserId);
      expect(result.data.email_verified).toBe(false);
      expect(result.data.verification_email_sent).toBe(true);
    });

    it('should call createUser with correct dto (without captchaToken)', async () => {
      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('captchaToken');
      expect(callArg.email).toBe(mockEmail);
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should call createVerificationToken with correct args', async () => {
      await service.register(mockRegisterDto() as any);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date)
      );
    });

    it('should call createVerificationToken exactly once', async () => {
      await service.register(mockRegisterDto() as any);

      expect(authRepo.createVerificationToken).toHaveBeenCalledTimes(1);
    });

    it('should send verification email after registration', async () => {
      await service.register(mockRegisterDto() as any);

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockEmail,
        mockVerificationToken
      );
    });

    it('should send verification email exactly once', async () => {
      await service.register(mockRegisterDto() as any);

      expect(mailService.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if captcha is invalid', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow(BadRequestException);
    });

    it('should not proceed further if captcha fails', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow();
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow(BadRequestException);
    });

    it('should not create user if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should generate unique username if username already taken', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true) // original username taken
        .mockResolvedValueOnce(false); // generated username available

      const result = await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).not.toBe('yara_senousy');
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
      expect(result.status).toBe('success');
    });

    it('should keep recursing until unique username is found', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true) // original taken
        .mockResolvedValueOnce(true) // first generated taken
        .mockResolvedValueOnce(false); // second generated available

      await service.register(mockRegisterDto() as any);

      // checkUsernameExists called 3 times total
      expect(userService.checkUsernameExists).toHaveBeenCalledTimes(3);
    });

    it('should not change username if original is available', async () => {
      userService.checkUsernameExists.mockResolvedValue(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should not call createVerificationToken if createUser fails', async () => {
      userService.createUser.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('DB error');
      expect(authRepo.createVerificationToken).not.toHaveBeenCalled();
    });

    it('should not send email if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if sendEmailVerification fails', async () => {
      mailService.sendEmailVerification.mockRejectedValue(new Error('Mail error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('Mail error');
    });

    it('should return created_at from the created user', async () => {
      const fixedDate = new Date('2025-01-01T00:00:00Z');
      userService.createUser.mockResolvedValue({ ...mockUser(), created_at: fixedDate });

      const result = await service.register(mockRegisterDto() as any);

      expect(result.data.created_at).toEqual(fixedDate);
    });
  });

  // ─── verifyEmail() ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should call authRepository.verifyEmail with the token', async () => {
      authRepo.verifyEmail.mockResolvedValue({
        status: 'success',
        message: 'Email verified successfully.',
      });

      await service.verifyEmail(mockVerificationToken);

      expect(authRepo.verifyEmail).toHaveBeenCalledWith(mockVerificationToken);
      expect(authRepo.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should return success response from repository', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Email verified successfully.',
      };
      authRepo.verifyEmail.mockResolvedValue(mockResponse);

      const result = await service.verifyEmail(mockVerificationToken);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException if token is invalid', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException if token is expired', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Token has expired'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException if token not found', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Token not found'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty token string', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(service.verifyEmail('')).rejects.toThrow(BadRequestException);
      expect(authRepo.verifyEmail).toHaveBeenCalledWith('');
    });
  });

  // ─── resendVerificationEmail() ────────────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    beforeEach(() => {
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.findEmailRecord.mockResolvedValue(mockUserEmail());
      authRepo.countRecentVerificationTokens.mockResolvedValue(0);
      authRepo.deleteExistingTokens.mockResolvedValue(undefined);
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
    });

    it('should resend verification email successfully', async () => {
      const result = await service.resendVerificationEmail(mockEmail);

      expect(result.status).toBe('success');
    });

    it('should delete existing token before creating new one', async () => {
      await service.resendVerificationEmail(mockEmail);

      expect(authRepo.deleteExistingTokens).toHaveBeenCalledWith(mockEmail);
      expect(authRepo.createVerificationToken).toHaveBeenCalled();
    });

    it('should call deleteExistingTokens before createVerificationToken', async () => {
      const callOrder: string[] = [];
      authRepo.deleteExistingTokens.mockImplementation(async () => {
        callOrder.push('delete');
      });
      authRepo.createVerificationToken.mockImplementation(async () => {
        callOrder.push('create');
      });

      await service.resendVerificationEmail(mockEmail);

      expect(callOrder).toEqual(['delete', 'create']);
    });

    it('should send email with the new verification token', async () => {
      await service.resendVerificationEmail(mockEmail);

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockEmail,
        mockVerificationToken
      );
    });

    it('should create new verification token with correct args', async () => {
      await service.resendVerificationEmail(mockEmail);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserEmail().user_id,
        mockVerificationToken,
        mockEmail,
        expect.any(Date)
      );
    });

    it('should throw NotFoundException if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(NotFoundException);
    });

    it('should not proceed if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(authRepo.countRecentVerificationTokens).not.toHaveBeenCalled();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({
        ...mockUserEmail(),
        is_verified: true,
      });

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(BadRequestException);
    });

    it('should not proceed if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({
        ...mockUserEmail(),
        is_verified: true,
      });

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw 429 if rate limit exceeded (count === 3)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(3);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(
        new HttpException(
          'Too many verification emails sent. Please try again in 5 minutes.',
          HttpStatus.TOO_MANY_REQUESTS
        )
      );
    });

    it('should throw 429 if rate limit exceeded (count > 3)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(5);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(
        new HttpException(
          'Too many verification emails sent. Please try again in 5 minutes.',
          HttpStatus.TOO_MANY_REQUESTS
        )
      );
    });

    it('should NOT throw if count is exactly 2 (boundary — still allowed)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(2);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should NOT throw if count is 0', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(0);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should not send email if rate limit exceeded', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(3);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if deleteExistingTokens fails', async () => {
      authRepo.deleteExistingTokens.mockRejectedValue(new Error('DB error'));

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if sendEmailVerification fails', async () => {
      mailService.sendEmailVerification.mockRejectedValue(new Error('Mail error'));

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow('Mail error');
    });
  });

  // ─── generateUniqueUsername() ─────────────────────────────────────────────────

  describe('generateUniqueUsername (via register)', () => {
    beforeEach(() => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(true);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.checkEmailExists.mockResolvedValue(false);
      userService.createUser.mockResolvedValue(mockUser());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
    });

    it('should not modify username if original is available', async () => {
      userService.checkUsernameExists.mockResolvedValue(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should generate username with correct pattern if taken once', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
    });

    it('should recurse until a unique username is found', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      expect(userService.checkUsernameExists).toHaveBeenCalledTimes(3);
    });

    it('generated username should always start with base username', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_/);
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      userService.findByEmail.mockResolvedValue(mockUser());
      userService.findByUsername.mockResolvedValue(null);
      userService.verifyPassword.mockResolvedValue(true);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    it('should return success response with correct user data on valid email login', async () => {
      const result = await service.login(mockLoginDto() as any, res as any);

      expect(result.status).toBe('success');
      expect(result.data.user_id).toBe(mockUserId);
      expect(result.data.email).toBe(mockEmail);
      expect(result.data.username).toBe(mockUsername);
    });

    it('should find user by username when email lookup returns null', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(mockUser());

      const result = await service.login(mockLoginDtoWithUsername() as any, res as any);

      expect(userService.findByUsername).toHaveBeenCalledWith(mockUsername);
      expect(result.status).toBe('success');
    });

    it('should not call findByUsername if findByEmail succeeds', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(userService.findByUsername).not.toHaveBeenCalled();
    });

    it('should sign access token with correct payload', async () => {
      await service.login(mockLoginDto() as any, res as any);

      const signSpy = jwtService.sign as jest.Mock;
      const firstCallPayload = signSpy.mock.calls[0][0];
      expect(firstCallPayload.sub).toBe(mockUserId);
      expect(firstCallPayload.email).toBe(mockEmail);
      expect(firstCallPayload.role).toBe('listener');
      expect(firstCallPayload.plan).toBe('free');
    });

    it('should sign refresh token with JWT_REFRESH_SECRET', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('test-refresh-secret');

      await service.login(mockLoginDto() as any, res as any);

      const signSpy = jwtService.sign as jest.Mock;
      const secondCallOptions = signSpy.mock.calls[1][1];
      expect(secondCallOptions.secret).toBe('test-refresh-secret');
    });

    it('should save hashed refresh token in DB (not raw token)', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledWith(
        mockUserId,
        expect.not.stringContaining(mockRefreshToken), // stored value is a hash, not the raw token
        expect.any(Date)
      );
    });

    it('should save refresh token exactly once', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should set access_token httpOnly cookie', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockAccessToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set refresh_token httpOnly cookie', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockRefreshToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set both cookies (called exactly twice)', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('should use primary email in the response even when logging in with username', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(mockUser());

      const result = await service.login(mockLoginDtoWithUsername() as any, res as any);

      expect(result.data.email).toBe(mockEmail);
    });

    // ── User not found ─────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if neither email nor username matches', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should not set cookies if user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── Email not verified ─────────────────────────────────────────────────────

    it('should throw ForbiddenException if email login used with unverified email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, is_primary: true, is_verified: false, user_id: mockUserId }],
      });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if primary email is not verified (username login)', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, is_primary: true, is_verified: false, user_id: mockUserId }],
      });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user has no emails at all', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({ ...mockUser(), emails: [] });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user has no primary email', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, is_primary: false, is_verified: true, user_id: mockUserId }],
      });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    // ── Suspended account ──────────────────────────────────────────────────────

    it('should throw ForbiddenException if account is suspended', async () => {
      userService.findByEmail.mockResolvedValue({ ...mockUser(), is_suspended: true });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should not verify password if account is suspended', async () => {
      userService.findByEmail.mockResolvedValue({ ...mockUser(), is_suspended: true });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(userService.verifyPassword).not.toHaveBeenCalled();
    });

    // ── Wrong password ─────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should not save refresh token if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should not set cookies if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failure ─────────────────────────────────────────────────────────────

    it('should propagate error if saveRefreshToken fails', async () => {
      authRepo.saveRefreshToken.mockRejectedValue(new Error('DB error'));

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow('DB error');
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.logout(res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Logged out successfully');
    });

    it('should clear access_token cookie', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should clear refresh_token cookie', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should clear both cookies exactly once each', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should revoke the hashed refresh token in DB when token is provided', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith(
        expect.not.stringContaining(mockRefreshToken)
      );
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not call revokeRefreshToken if no refresh token provided', async () => {
      await service.logout(res as any, undefined);

      expect(authRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('should still clear cookies and return success even if revoke throws', async () => {
      authRepo.revokeRefreshToken.mockRejectedValue(new Error('DB error'));

      const result = await service.logout(res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should succeed without a refresh token (logout with only access token)', async () => {
      const result = await service.logout(res as any);

      expect(result.status).toBe('success');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  // ─── refreshTokens() ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.findValidRefreshToken.mockResolvedValue(mockStoredRefreshToken());
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    it('should return success response', async () => {
      const result = await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Token refreshed successfully');
    });

    it('should look up the hashed token in DB (not raw)', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(authRepo.findValidRefreshToken).toHaveBeenCalledWith(
        expect.not.stringContaining(mockRefreshToken) // must be a hash
      );
    });

    it('should revoke the old token before issuing a new one', async () => {
      const callOrder: string[] = [];
      authRepo.revokeRefreshToken.mockImplementation(async () => {
        callOrder.push('revoke');
      });
      authRepo.saveRefreshToken.mockImplementation(async () => {
        callOrder.push('save');
      });

      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(callOrder[0]).toBe('revoke');
      expect(callOrder[1]).toBe('save');
    });

    it('should save the new hashed refresh token in DB', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(authRepo.saveRefreshToken).toHaveBeenCalledWith(
        mockUserId,
        expect.any(String),
        expect.any(Date)
      );
    });

    it('should set new access_token cookie', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockAccessToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set new refresh_token cookie', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockRefreshToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should sign new access token with correct payload', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      const signSpy = jwtService.sign as jest.Mock;
      const firstCallPayload = signSpy.mock.calls[0][0];
      expect(firstCallPayload.sub).toBe(mockUserId);
      expect(firstCallPayload.email).toBe(mockEmail);
    });

    it('should sign new refresh token with JWT_REFRESH_SECRET', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('test-refresh-secret');

      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      const signSpy = jwtService.sign as jest.Mock;
      const secondCallOptions = signSpy.mock.calls[1][1];
      expect(secondCallOptions.secret).toBe('test-refresh-secret');
    });

    // ── Token not found / revoked ──────────────────────────────────────────────

    it('should throw UnauthorizedException if token not found in DB', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not issue new tokens if stored token is not found', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── Expired token ──────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if stored token is expired', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke the expired token before throwing', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not set cookies if token is expired', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failure ─────────────────────────────────────────────────────────────

    it('should propagate error if saveRefreshToken fails', async () => {
      authRepo.saveRefreshToken.mockRejectedValue(new Error('DB error'));

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow('DB error');
    });
  });

  // ─── removeUser() ─────────────────────────────────────────────────────────────

  describe('removeUser', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      userService.remove.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Your account has been deleted successfully.');
    });

    it('should call logout before removing user', async () => {
      const callOrder: string[] = [];
      authRepo.revokeRefreshToken.mockImplementation(async () => {
        callOrder.push('logout');
      });
      userService.remove.mockImplementation(async () => {
        callOrder.push('remove');
      });

      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(callOrder[0]).toBe('logout');
      expect(callOrder[1]).toBe('remove');
    });

    it('should clear both cookies as part of logout', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });

    it('should call userService.remove with the correct userId', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(userService.remove).toHaveBeenCalledWith(mockUserId);
      expect(userService.remove).toHaveBeenCalledTimes(1);
    });

    it('should revoke refresh token during logout', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should still remove user even if refresh token is not provided', async () => {
      const result = await service.removeUser(mockUserId, res as any, undefined);

      expect(userService.remove).toHaveBeenCalledWith(mockUserId);
      expect(result.status).toBe('success');
    });

    it('should propagate error if userService.remove fails', async () => {
      userService.remove.mockRejectedValue(new Error('DB error'));

      await expect(service.removeUser(mockUserId, res as any, mockRefreshToken)).rejects.toThrow(
        'DB error'
      );
    });

    it('should not call userService.remove if logout itself throws', async () => {
      authRepo.revokeRefreshToken.mockRejectedValue(new Error('hard failure'));
      res.clearCookie = jest.fn().mockImplementationOnce(() => {
        throw new Error('cookie error');
      });

      await expect(service.removeUser(mockUserId, res as any, mockRefreshToken)).rejects.toThrow(
        'cookie error'
      );
      expect(userService.remove).not.toHaveBeenCalled();
    });
  });

  // ─── handleOAuthCallback() ────────────────────────────────────────────────────

  describe('handleOAuthCallback', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.findById.mockResolvedValue(mockUser());
      userService.createSocialAccount.mockResolvedValue(undefined);
      authRepo.createPendingOauthToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockPendingToken);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    // ── Case 1: Returning user ─────────────────────────────────────────────────

    it('should return login response for returning user (social account found)', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(result.status).toBe('success');
      expect(result.type).toBe('login');
    });

    it('should call findById with user_id from social account', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should issue tokens for returning user', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('should not call findByEmail if social account is found', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found for social account', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());
      userService.findById.mockResolvedValue(null);

      await expect(service.handleOAuthCallback(mockOAuthProfile(), res as any)).rejects.toThrow(
        NotFoundException
      );
    });

    // ── Case 2: Email already registered ──────────────────────────────────────

    it('should link social account and login if email already registered', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(result.status).toBe('success');
      expect(result.type).toBe('login');
      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'google',
        mockProviderId,
        mockEmail
      );
    });

    it('should issue tokens when linking existing account', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not create pending session if email already registered', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.createPendingOauthToken).not.toHaveBeenCalled();
    });

    // ── Case 3: Brand new user ─────────────────────────────────────────────────

    it('should return registration_incomplete for brand new user', async () => {
      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(result.status).toBe('success');
      expect(result.type).toBe('registration_incomplete');
    });

    it('should return pending_token in response for new user', async () => {
      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      if ('pending_token' in result.data) {
        expect(result.data.pending_token).toBe(mockPendingToken);
      } else {
        fail('pending_token not found in result.data');
      }
    });

    it('should return prefill data for new user', async () => {
      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      if ('prefill' in result.data) {
        expect(result.data.prefill.email).toBe(mockEmail);
        expect(result.data.prefill.display_name).toBe('Yara Senousy');
      } else {
        fail('prefill not found in result.data');
      }
    });

    it('should call createPendingOauthToken with correct args for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.createPendingOauthToken).toHaveBeenCalledWith(
        mockPendingToken,
        'google',
        mockProviderId,
        mockEmail,
        'Yara',
        'Senousy',
        expect.any(Date)
      );
    });

    it('should not issue tokens for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should not call createSocialAccount for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.createSocialAccount).not.toHaveBeenCalled();
    });
  });

  // ─── completeOAuthProfile() ───────────────────────────────────────────────────

  describe('completeOAuthProfile', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.findPendingToken.mockResolvedValue(mockPendingOAuthSession());
      authRepo.deletePendingToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      userService.checkUsernameExists.mockResolvedValue(false);
      userService.createOAuthUser.mockResolvedValue(mockUser());
      userService.createSocialAccount.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    it('should return success response after completing profile', async () => {
      const result = await service.completeOAuthProfile(
        mockCompleteOAuthProfileDto() as any,
        res as any
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Profile completed and logged in successfully');
    });

    it('should create user with correct data from pending session and form', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          first_name: 'Yara',
          last_name: 'Senousy',
          display_name: 'Yara Senousy',
          birthdate: '1995-06-15',
          gender: 'female',
        })
      );
    });

    it('should create social account after creating user', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'google',
        mockProviderId,
        mockEmail
      );
    });

    it('should call createSocialAccount after createOAuthUser', async () => {
      const callOrder: string[] = [];
      userService.createOAuthUser.mockImplementation(async () => {
        callOrder.push('createOAuthUser');
        return mockUser();
      });
      userService.createSocialAccount.mockImplementation(async () => {
        callOrder.push('createSocialAccount');
      });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      expect(callOrder[0]).toBe('createOAuthUser');
      expect(callOrder[1]).toBe('createSocialAccount');
    });

    it('should delete pending token after creating user', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      expect(authRepo.deletePendingToken).toHaveBeenCalledWith(mockPendingToken);
      expect(authRepo.deletePendingToken).toHaveBeenCalledTimes(1);
    });

    it('should issue tokens after completing profile', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should generate username from display_name', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      const callArg = userService.createOAuthUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy/);
    });

    it('should generate unique username if display_name based username is taken', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any);

      const callArg = userService.createOAuthUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
    });

    // ── Invalid token ──────────────────────────────────────────────────────────

    it('should throw NotFoundException if pending token not found', async () => {
      authRepo.findPendingToken.mockResolvedValue(null);

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should not create user if pending token not found', async () => {
      authRepo.findPendingToken.mockResolvedValue(null);

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow();
      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });

    // ── Expired token ──────────────────────────────────────────────────────────

    it('should throw BadRequestException if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not create user if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow();
      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });

    it('should not set cookies if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failures ────────────────────────────────────────────────────────────

    it('should propagate error if createOAuthUser fails', async () => {
      userService.createOAuthUser.mockRejectedValue(new Error('DB error'));

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow('DB error');
    });

    it('should not issue tokens if createSocialAccount fails', async () => {
      userService.createSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any)
      ).rejects.toThrow('DB error');
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });
});
